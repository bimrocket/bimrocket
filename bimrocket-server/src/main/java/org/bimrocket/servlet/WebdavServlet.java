/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2025, Ajuntament de Sant Feliu de Llobregat
 *
 * This program is licensed and may be used, modified and redistributed under
 * the terms of the European Public License (EUPL), either version 1.1 or (at
 * your option) any later version as soon as they are approved by the European
 * Commission.
 *
 * Alternatively, you may redistribute and/or modify this program under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either  version 3 of the License, or (at your option)
 * any later version.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the licenses for the specific language governing permissions, limitations
 * and more details.
 *
 * You should have received a copy of the EUPL1.1 and the LGPLv3 licenses along
 * with this program; if not, you may find them at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 * http://www.gnu.org/licenses/
 * and
 * https://www.gnu.org/licenses/lgpl.txt
 */
package org.bimrocket.servlet;

import jakarta.inject.Inject;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.bimrocket.api.security.User;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotAuthorizedException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.service.file.FileService;
import org.bimrocket.service.file.FindOptions;
import org.bimrocket.service.file.Metadata;
import org.bimrocket.service.file.Path;
import org.bimrocket.service.file.exception.LockedFileException;
import org.bimrocket.service.file.util.MutableACL;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.servlet.webdav.MutableACLXMLSerializer;
import org.bimrocket.util.URIEncoder;

import java.io.*;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLDecoder;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;
import java.util.logging.Level;
import java.util.logging.Logger;


/**
 *
 * @author realor
 */
@WebServlet(name = "Webdav", urlPatterns = "/api/cloudfs/*")
public class WebdavServlet extends HttpServlet
{
  private static final long serialVersionUID = 1L;

  static final Logger LOGGER =
    Logger.getLogger(WebdavServlet.class.getName());

  private static final String WEBDAV_METHODS =
    "HEAD,GET,POST,PUT,DELETE,OPTIONS,PROPFIND,PROPPATCH,MKCOL,ACL,LOCK,UNLOCK,COPY,MOVE";

  private static final String WEBDAV_HEADERS =
    "origin,content-type,accept,authorization,depth,if-modified-since,if-none-match,x-requested-with";

  @Inject
  transient FileService fileService;

  @Inject
  transient SecurityService securityService;

  @Override
  protected void doOptions(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    response.setHeader("DAV", "1,2");
    response.setHeader("Allow", WEBDAV_METHODS);
    response.setHeader("MS-Author-Via", "DAV");
  }

  @Override
  protected void doHead(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    Metadata metadata = fileService.get(path);
    sendMetadata(metadata, request, response);
  }

  protected void doPropfind(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    FindOptions options = new FindOptions();

    String depth = request.getHeader("depth");
    if (depth != null)
    {
      depth = depth.toLowerCase();
      options.setIncludeRoot(!depth.contains("noroot"));
      if (depth.contains("infinity")) options.setDepth(FindOptions.INFINITY);
      else if (depth.contains("0")) options.setDepth(0);
    }

    List<Metadata> metadatas = fileService.find(path, options);

    response.setContentType("text/xml");
    response.setCharacterEncoding("UTF-8");
    response.setHeader("DAV", "1,2");

    if (metadatas.isEmpty())
    {
      response.setStatus(404);
      response.setContentType("text/plain");
      response.getWriter().println("The requested resource was not found on this server.");

    }
    else
    {
      response.setStatus(207);
      String basePath = request.getContextPath() + request.getServletPath();

      try (Writer writer = response.getWriter())
      {
        writer.write("<?xml version=\"1.0\" encoding=\"utf-8\" ?>");
        writer.write("<D:multistatus xmlns:D=\"DAV:\">");
        writeProperties(metadatas, basePath, writer);
        writer.write("</D:multistatus>");
      }
    }
  }

  protected void doProppatch(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
  }

  protected void doMkcol(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    fileService.makeCollection(path);
    response.setStatus(201); // created
  }

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    Metadata metadata = fileService.get(path);
    if (metadata.isCollection())
    {
      doPropfind(request, response);
    }
    else
    {
      try (InputStream is = fileService.read(path))
      {
        sendMetadata(metadata, request, response);
        IOUtils.copy(is, response.getOutputStream());
      }
    }
  }

  @Override
  protected void doPut(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    try (InputStream is = request.getInputStream())
    {
      fileService.write(path, is, request.getContentType());
    }
  }

  @Override
  protected void doDelete(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    fileService.delete(path);
    response.setStatus(204); // no content
  }

  protected void doAcl(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException, Exception
  {
    StringBuilder requestBody = new StringBuilder();
    String line;
    try (BufferedReader reader = request.getReader())
    {
      while ((line = reader.readLine()) != null)
      {
        requestBody.append(line).append("\n");
      }
    }

    Path path = getPath(request);
    logParameters(request, path);

    String requestXmlData = requestBody.toString();

    User user = securityService.getCurrentUser();

    MutableACL acl = MutableACLXMLSerializer.deserialize(requestXmlData, user.getId());

    fileService.setACL(path, acl);

    response.setStatus(HttpServletResponse.SC_OK);
  }

  protected void doLock(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    fileService.lock(path);
  }

  protected void doUnlock(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path path = getPath(request);

    logParameters(request, path);

    fileService.unlock(path);
  }

  protected void doMove(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path sourcePath = getPath(request);
    Path destPath = getDestinationPath(request);

    logParameters(request, sourcePath + " TO " + destPath);

    fileService.move(sourcePath, destPath);
    response.setStatus(201); // created
  }

  protected void doCopy(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    Path sourcePath = getPath(request);
    Path destPath = getDestinationPath(request);

    logParameters(request, sourcePath + " TO " + destPath);

    fileService.copy(sourcePath, destPath);
    response.setStatus(201); // created
  }

  @Override
  protected void service(HttpServletRequest request, HttpServletResponse response)
    throws ServletException, IOException
  {
    sendHeaders(request, response);
    String method = request.getMethod();
    try
    {
      switch (method)
      {
        case "PROPFIND" -> doPropfind(request, response);
        case "PROPPATCH" -> doProppatch(request, response);
        case "MKCOL" -> doMkcol(request, response);
        case "ACL" -> doAcl(request, response);
        case "LOCK" -> doLock(request, response);
        case "UNLOCK" -> doUnlock(request, response);
        case "MOVE" -> doMove(request, response);
        case "COPY" -> doCopy(request, response);
        default -> super.service(request, response);
      }
    }
    catch (InvalidRequestException ex)
    {
      response.sendError(400, ex.getMessage());
    }
    catch (NotAuthorizedException ex)
    {
      response.sendError(401, ex.getMessage());
    }
    catch (AccessDeniedException ex)
    {
      response.sendError(403, ex.getMessage());
    }
    catch (NotFoundException ex)
    {
      response.sendError(404, ex.getMessage());
    }
    catch (LockedFileException ex)
    {
      response.sendError(423, ex.getMessage());
    }
    catch (Exception ex)
    {
      response.sendError(500, ex.getMessage());
    }
    log(request, response);
  }

  // internal methods

  void logParameters(HttpServletRequest request, Object parameters)
  {
    request.setAttribute("log.parameters", parameters.toString());
  }

  void log(HttpServletRequest request, HttpServletResponse response)
  {
    String method = request.getMethod();
    String parameters = (String)request.getAttribute("log.parameters");
    int status = response.getStatus();

    if (parameters == null)
    {
      LOGGER.log(Level.INFO, "{0} -> {1}",
       new Object[] { method, status });
    }
    else
    {
      LOGGER.log(Level.INFO, "{0} {1} -> {2}",
       new Object[] { method, parameters, status });
    }
  }

  Path getPath(HttpServletRequest request) throws UnsupportedEncodingException
  {
    int contextPathLength = request.getContextPath().length();
    int servletPathLength = request.getServletPath().length();
    int baseLength = contextPathLength + servletPathLength;
    String spath = request.getRequestURI().substring(baseLength);
    spath = URLDecoder.decode(spath, "UTF-8");
    return new Path(spath);
  }

  Path getDestinationPath(HttpServletRequest request)
    throws MalformedURLException, UnsupportedEncodingException
  {
    String destination = request.getHeader("Destination");
    if (destination == null)
      throw new InvalidRequestException("Missing destination");

    URL url = new URL(destination);
    int contextPathLength = request.getContextPath().length();
    int servletPathLength = request.getServletPath().length();
    int baseLength = contextPathLength + servletPathLength;
    String spath = url.getPath().substring(baseLength);
    spath = URLDecoder.decode(spath, "UTF-8");

    return new Path(spath);
  }

  void writeProperties(List<Metadata> metadatas, String basePath,
    Writer writer) throws IOException
  {
    DateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
    TimeZone tz = TimeZone.getTimeZone("UTC");
    df.setTimeZone(tz);

    for (Metadata metadata : metadatas)
    {
      Path path = metadata.getPath();
      String href = URIEncoder.encode(basePath + path.toString());
      writer.write("<D:response><D:href>" + href + "</D:href>");
      writer.write("<D:propstat>");
      writer.write("<D:prop>");
      Date creationDate = new Date(metadata.getCreationDate());
      Date modifyDate = new Date(metadata.getLastModifiedDate());

      writer.write("<D:creationdate>" + df.format(creationDate) + "</D:creationdate>");
      writer.write("<D:getlastmodified>" + df.format(modifyDate) + "</D:getlastmodified>");
      if (metadata.isCollection())
      {
        writer.write("<D:resourcetype><D:collection/></D:resourcetype>");
      }
      else
      {
        writer.write("<D:getcontentlength>" + metadata.getContentLength() +
          "</D:getcontentlength>");
        writer.write("<D:resourcetype/>");
      }
      writer.write("<D:source></D:source>");
      writer.write("<D:supportedlock>" +
        "<D:lockentry>" +
        "<D:lockscope><D:exclusive/></D:lockscope>" +
        "<D:locktype><D:write/></D:locktype>" +
        "</D:lockentry>" +
        "<D:lockentry>" +
        "<D:lockscope><D:shared/></D:lockscope>" +
        "<D:locktype><D:write/></D:locktype>" +
        "</D:lockentry>" +
        "</D:supportedlock>");
      writer.write("</D:prop>");
      writer.write("<D:status>HTTP/1.1 200 OK</D:status>");
      writer.write("</D:propstat>");
      writer.write("</D:response>");
    }
  }

  void sendMetadata(Metadata metadata,
    HttpServletRequest request, HttpServletResponse response)
  {
    String contentType = metadata.getContentType();
    long contentLength = metadata.getContentLength();
    long lastModified = metadata.getLastModifiedDate();

    if (!metadata.isCollection())
    {
      response.setContentType(contentType);
      response.setContentLengthLong(contentLength);
      response.setDateHeader("Last-Modified", lastModified);
      response.setHeader("Cache-Control", "No-Cache");

      String etag = metadata.getEtag();
      if (etag == null)
      {
        // week etag
        etag = "W/\"" + contentLength + "-" + lastModified + "\"";
      }
      String reqEtag = request.getHeader("If-None-Match");
      if (etag.equals(reqEtag))
      {
        response.setStatus(304);
      }
      else
      {
        response.setHeader("ETag", etag);
        response.setStatus(200);
      }
    }
  }

  void sendHeaders(HttpServletRequest request, HttpServletResponse response)
  {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Headers", WEBDAV_HEADERS);
    response.setHeader("Access-Control-Allow-Methods", WEBDAV_METHODS);
    String requestedWith = request.getHeader("X-Requested-With");
    if (requestedWith == null)
    {
      response.setHeader("WWW-Authenticate", "Basic realm=\"bimrocket realm\"");
    }
  }
}
