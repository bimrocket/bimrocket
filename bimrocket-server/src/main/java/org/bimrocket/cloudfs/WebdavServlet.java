/*
 * BIMROCKET
 *  
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
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

package org.bimrocket.cloudfs;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.apache.commons.codec.binary.Base64;
/**
 *
 * @author realor
 */
public class WebdavServlet extends HttpServlet
{
  private static final Logger LOGGER = Logger.getLogger("WebdavServlet");
  public static final int SC_MULTI_STATUS = 207;
  public static final String BASE_PROPERTY = "BASE_PROPERTY";
  public static final String BASE_DIR_NAME = "BASE_DIR_NAME";
  public static final String ACL_FILENAME = "acl.properties";
  public static final String REQUEST_AUTHENTICATION = "Request-Authentication";
  public static final String ANONYMOUS = "anonymous";
  private static final long serialVersionUID = 1L;
  private File baseDir;
  private CredentialsManager credentialsManager;

  public WebdavServlet()
  {
  }

  @Override
  public void init(ServletConfig config) throws ServletException
  {
    String baseDirName = config.getInitParameter(BASE_DIR_NAME);
    String baseProperty = config.getInitParameter(BASE_PROPERTY);
    String basePath = System.getProperty(baseProperty);
    baseDir = new File(basePath, baseDirName);
    if (!baseDir.exists())
    {
      baseDir.mkdirs();
    }
    LOGGER.log(Level.INFO, "Using base directory: {0}",
      baseDir.getAbsolutePath());

    credentialsManager = new LocalCredentialsManager(baseDir);
  }

  @Override
  protected void service(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    String method = req.getMethod();

    if (method.equals("PROPFIND"))
    {
      doPropfind(req, resp);
    }
    else if (method.equals("MKCOL"))
    {
      doMkcol(req, resp);
    }
//    else if (method.equals("PROPPATCH"))
//    {
//      doProppatch(req, resp);
//    }
//    else if (method.equals("COPY"))
//    {
//      doCopy(req, resp);
//    }
//    else if (method.equals("MOVE"))
//    {
//      doMove(req, resp);
//    }
//    else if (method.equals("LOCK"))
//    {
//      doLock(req, resp);
//    }
//    else if (method.equals("UNLOCK"))
//    {
//      doUnlock(req, resp);
//    }
    else
    {
      super.service(req, resp);
    }
  }

  @Override
  protected void doOptions(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    resp.setHeader("DAV", "1,2");
    resp.setHeader("Allow", "HEAD,GET,PUT,DELETE,OPTIONS,PROPFIND,MKCOL");
  }
  
  protected void doPropfind(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    Credentials credentials = getCredentials(req);

    String relUri = getRelativeURI(req);
    File file = getRequestedFile(relUri);
    if (file == null)
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (credentialsManager.isValid(credentials) &&
        isAuthorized("r", credentials.getUserId(), file))
    {
      String depth = req.getHeader("depth");
      if (depth == null) depth = "infinity";

      if (isValidFile(file))
      {
        resp.setStatus(SC_MULTI_STATUS);
        resp.setContentType("text/xml; charset=UTF-8");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter writer = resp.getWriter();
        writer.write("<?xml version=\"1.0\" encoding=\"utf-8\" ?>");
        writer.write("<D:multistatus xmlns:D=\"DAV:\">");
        sendProperties(file, req.getRequestURI(), depth, writer);
        writer.write("</D:multistatus>");
        writer.flush();
        writer.close();
      }
      else
      {
        resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
      }
    }
    else
    {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      if (!"false".equals(req.getHeader(REQUEST_AUTHENTICATION)))
      {
        resp.setHeader("WWW-Authenticate", "Basic");
      }
    }
  }

  protected void doMkcol(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    Credentials credentials = getCredentials(req);
  
    String relUri = getRelativeURI(req);
    File file = getRequestedFile(relUri);
    if (file == null)
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }
    
    if (credentialsManager.isValid(credentials) &&
      isAuthorized("w", credentials.getUserId(), file))
    {
      if (file.exists())
      {
        resp.sendError(HttpServletResponse.SC_METHOD_NOT_ALLOWED);
      }
      else
      {
        file.mkdirs();
        resp.setStatus(HttpServletResponse.SC_CREATED);
      }
    }
    else
    {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      if (!"false".equals(req.getHeader(REQUEST_AUTHENTICATION)))
      {
        resp.setHeader("WWW-Authenticate", "Basic");
      }
    }
  }

  @Override
  protected void doHead(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    Credentials credentials = getCredentials(req);

    String relUri = getRelativeURI(req);
    File file = getRequestedFile(relUri);
    if (file == null)
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (credentialsManager.isValid(credentials) &&
        isAuthorized("r", credentials.getUserId(), file))
    {
      if (!file.exists() || file.isHidden())
      {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
      }
      else
      {
        if (file.isDirectory())
        {
          sendDirectory(file, req, resp, false);
        }
        else
        {
          sendFile(file, req, resp, false);
        }
      }
    }
    else
    {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      if (!"false".equals(req.getHeader(REQUEST_AUTHENTICATION)))
      {
        resp.setHeader("WWW-Authenticate", "Basic");
      }
    }
  }

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    Credentials credentials = getCredentials(req);

    String relUri = getRelativeURI(req);
    File file = getRequestedFile(relUri);
    if (file == null)
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (credentialsManager.isValid(credentials) &&
        isAuthorized("r", credentials.getUserId(), file))
    {
      if (!file.exists() || file.isHidden())
      {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
      }
      else
      {
        if (file.isDirectory())
        {
          sendDirectory(file, req, resp, true);
        }
        else
        {
          sendFile(file, req, resp, true);
        }
      }
    }
    else
    {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      if (!"false".equals(req.getHeader(REQUEST_AUTHENTICATION)))
      {
        resp.setHeader("WWW-Authenticate", "Basic");
      }
    }
  }

  @Override
  protected void doPut(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    Credentials credentials = getCredentials(req);

    String relUri = getRelativeURI(req);
    File file = getRequestedFile(relUri);
    if (file == null)
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    file.getParentFile().mkdirs();
    FileOutputStream os = new FileOutputStream(file);
    try
    {
      IOUtils.copy(req.getInputStream(), os);
    }
    finally
    {
      os.close();
    }
  }

  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    Credentials credentials = getCredentials(req);

    String relUri = getRelativeURI(req);
    File file = getRequestedFile(relUri);
    if (file == null)
    {
      resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
      return;
    }

    if (credentialsManager.isValid(credentials)  &&
        isAuthorized("d", credentials.getUserId(), file))
    {
      file.delete();
    }
    else
    {
      resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      if (!"false".equals(req.getHeader(REQUEST_AUTHENTICATION)))
      {
        resp.setHeader("WWW-Authenticate", "Basic");
      }
    }
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp)
    throws ServletException, IOException
  {
    // password management
  }

  // private methods

  private void sendProperties(File file, String uri, String depth,
     PrintWriter writer) throws IOException
  {
    if (!depth.contains("noroot"))
    {
      writer.write("<D:response><D:href>" + uri + "</D:href>");
      writer.write("<D:propstat>");
      writer.write("<D:prop>");
      Path path = FileSystems.getDefault().getPath(file.getAbsolutePath());
      BasicFileAttributes attributes =
        Files.readAttributes(path, BasicFileAttributes.class);
      String creationTime = attributes.creationTime().toString();
      String modifiedTime = attributes.lastModifiedTime().toString();
      writer.write("<D:creationdate>"+ creationTime + "</D:creationdate>");
      writer.write("<D:getlastmodified>"+ modifiedTime + "</D:getlastmodified>");
      if (file.isDirectory())
      {
        writer.write("<D:resourcetype><D:collection/></D:resourcetype>");
      }
      else
      {
        writer.write("<D:getcontentlength>"+ file.length() + "</D:getcontentlength>");        
        writer.write("<D:resourcetype/>");
      }
      writer.write("<D:source></D:source>");
      writer.write("<D:supportedlock><D:lockentry><D:lockscope><D:exclusive/></D:lockscope>" +
        "<D:locktype><D:write/></D:locktype></D:lockentry>" +
        "<D:lockentry><D:lockscope><D:shared/></D:lockscope><D:locktype>" +
        "<D:write/></D:locktype></D:lockentry></D:supportedlock>");
      writer.write("</D:prop>");
      writer.write("<D:status>HTTP/1.1 200 OK</D:status>");
      writer.write("</D:propstat>");
      writer.write("</D:response>");
    }

    if (file.isDirectory() && !depth.contains("0"))
    {
      File files[] = file.listFiles();
      depth = depth.contains("1") ? "0" : "infinity";
      if (!uri.endsWith("/")) uri += "/";
      for (File sfile : files)
      {
        if (isValidFile(sfile))
        {
          sendProperties(sfile, uri + sfile.getName(), depth, writer);
        }
      }
    }
  }

  private void sendDirectory(File dir,
    HttpServletRequest req, HttpServletResponse resp,
    boolean withContent) throws IOException
  {
    String contextPath = req.getContextPath();
    resp.setContentType("text/html");
    resp.setCharacterEncoding("UTF-8");
    if (withContent)
    {
      PrintWriter out = resp.getWriter();
      try
      {
        String uri = req.getRequestURI();
        if (!uri.endsWith("/")) uri += "/";

        String relUri = getRelativeURI(req);
        if (relUri.endsWith("/"))
          relUri = relUri.substring(0, relUri.length() - 1);

        out.println("<html>");
        out.println("<head>");
        out.println("<link href=\"" + contextPath +
          "/css/cloudfs.css\" type=\"text/css\" rel=\"stylesheet\" />");
        out.println("</head><body>");
        out.println("<p class=\"path\">"+ relUri + "</p>");
        out.println("<ul>");

        String href;
        if (relUri.substring(1).contains("/"))
        {
          href = uri + "..";
          out.println("<li class=\"moveup\"><a href=\"" + href +
            "\">..</a></li>");
        }
        File[] files = dir.listFiles();
        for (File file : files)
        {
          if (isValidFile(file))
          {
            String name = file.getName();
            href = uri + name;
            String className = file.isDirectory() ? "directory" : "file";
            out.println("<li class=\"" + className + "\">");
            out.println("<a href=\"" + href + "\">" + name + "</a>");
            out.println("</li>");
          }
        }
        out.println("</ul>");
        out.println("</body><html>");
      }
      finally
      {
        out.close();
      }
    }
  }

  private void sendFile(File file,
    HttpServletRequest req, HttpServletResponse resp,
    boolean withContent) throws IOException
  {
    resp.setContentType(getContentType(file)); // Collada
    resp.setContentLength((int)file.length());
    if (withContent)
    {
      FileInputStream is = new FileInputStream(file);
      try
      {
        IOUtils.copy(is, resp.getOutputStream());
      }
      finally
      {
        is.close();
      }
    }
  }

  private File getRequestedFile(String relUri)
  {
    File file = null;
    if (relUri.length() > 0)
    {
      if (relUri.startsWith("/")) relUri = relUri.substring(1);
      file = new File(baseDir, relUri);
    }
    return file;
  }

  private boolean isAuthorized(String action, String userId, File file)
    throws IOException
  {
    String userBasePath = baseDir.getAbsolutePath() + "/" + userId;
    String filePath = file.getAbsolutePath();
    
    userBasePath = userBasePath.replace("\\", "/"); // Windows
    filePath = filePath.replace("\\", "/");
    
    if (filePath.startsWith(userBasePath)) return true;
    
    File dir;
    if (file.isDirectory()) dir = file;
    else dir = file.getParentFile();

    File aclFile = new File(dir, ACL_FILENAME);
    if (aclFile.exists())
    {
      Properties properties = new Properties();
      FileInputStream fis = new FileInputStream(aclFile);
      try
      {
        properties.load(fis);
        String acl = properties.getProperty(userId);
        if (acl != null && acl.contains(action)) return true;
      }
      finally
      {
        fis.close();
      }
    }  
    return false;
  }

  private Credentials getCredentials(HttpServletRequest req)
  {
    Credentials credentials = new Credentials();

    String autho = req.getHeader("Authorization");
    if (autho != null && autho.startsWith("Basic "))
    {
      String basic = autho.substring(6);
      String userPassString =
        new String(Base64.decodeBase64(basic.getBytes()));
      String[] userPass = userPassString.split(":");
      if (userPass.length == 2)
      {
        credentials.setUserId(userPass[0].trim());
        credentials.setPassword(userPass[1]);
      }
    }
    return credentials;
  }

  private String getContentType(File file)
  {
    String filename = file.getName().toLowerCase();
    int index = filename.lastIndexOf(".");
    String extension;
    if (index != -1)
    {
      extension = filename.substring(index + 1);
    }
    else
    {
      extension = filename;
    }
    if (extension.equals("txt")) return "text/plain";
    if (extension.equals("json")) return "application/json";
    if (extension.equals("dae")) return "text/xml";
    if (extension.equals("xml")) return "text/xml";
    return "application/octet-stream";
  }

  private String getRelativeURI(HttpServletRequest req)
  {
    String uri = req.getRequestURI();
    String contextPath = req.getContextPath();
    String servletPath = req.getServletPath();
    return uri.substring(contextPath.length() + servletPath.length());
  }
  
  private boolean isValidFile(File file)
  {
    return file.exists() && !file.isHidden() && !file.getName().startsWith(".");
  }
}
