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
package org.bimrocket.api.cloudfs;

import io.swagger.v3.oas.annotations.Operation;
import org.bimrocket.api.cloudfs.methods.PROPFIND;
import org.bimrocket.api.cloudfs.methods.MKCOL;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.servlet.ServletContext;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HEAD;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.OPTIONS;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.CacheControl;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.PathSegment;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Iterator;
import java.util.List;
import org.apache.commons.io.IOUtils;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.FileSystem;
import java.util.Collections;
import java.util.Set;
import jakarta.ws.rs.core.Response.ResponseBuilder;
import static jakarta.ws.rs.core.MediaType.TEXT_XML;
import static jakarta.ws.rs.core.Response.Status.CREATED;
import static jakarta.ws.rs.core.Response.Status.FORBIDDEN;
import static jakarta.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;
import static jakarta.ws.rs.core.Response.Status.METHOD_NOT_ALLOWED;
import static jakarta.ws.rs.core.Response.Status.NOT_FOUND;
import java.util.Date;
import org.bimrocket.api.security.User;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.URIEncoder;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
@Path("cloudfs")
@Tag(name="CloudFS", description="Cloud File System")
public class CloudFsEndpoint
{
  static final String BASE = "services.cloudfs.";

  @Inject
  SecurityService securityService;

  @Inject
  Config config;

  @Context
  ServletContext servletContext;

  @Context
  HttpHeaders headers;

  @OPTIONS
  @PermitAll
  @Operation(summary = "Get HTTP options")
  public Response options()
  {
    return Response.ok()
      .header("DAV", "1,2")
      .header("Allow", "HEAD,GET,PUT,DELETE,OPTIONS,PROPFIND,MKCOL")
      .build();
  }

  @PROPFIND
  @Produces(TEXT_XML)
  @PermitAll
  @Operation(summary = "List root directory")
  public Response propfind(@HeaderParam("depth") String depth)
  {
    File file = getBaseDir();
    return sendFileProperties(file, "", depth);
  }

  @PROPFIND
  @Path("/{path:.*}")
  @Produces(TEXT_XML)
  @PermitAll
  @Operation(summary = "List directory")
  public Response propfind(@PathParam("path") List<PathSegment> path,
    @HeaderParam("depth") String depth)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (!file.exists())
      return Response.status(NOT_FOUND).build();

    if (!isValidFile(file))
      return Response.status(METHOD_NOT_ALLOWED).build();

    if (!isAccessAllowed(file, ACL.READ_ACTION))
      return Response.status(FORBIDDEN).build();

    return sendFileProperties(file, uri, depth);
  }

  @MKCOL
  @Path("/{path:.*}")
  @Operation(summary = "Make directory")
  public Response mkcol(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File dir = new File(getBaseDir(), uri);

    if (!isValidFile(dir) || dir.exists())
      return Response.status(METHOD_NOT_ALLOWED).build();

    if (!isAccessAllowed(dir.getParentFile(), ACL.WRITE_ACTION))
      return Response.status(FORBIDDEN).build();

    dir.mkdirs();

    return Response.status(CREATED).build();
  }

  @HEAD
  @Path("/{path:.*}")
  @PermitAll
  @Operation(summary = "Get HTTP head")
  public Response head(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (!file.exists())
      return Response.status(NOT_FOUND).build();

    if (!isValidFile(file))
      return Response.status(METHOD_NOT_ALLOWED).build();

    if (!isAccessAllowed(file, ACL.READ_ACTION))
      return Response.status(FORBIDDEN).build();

    if (file.isFile())
    {
      return sendFileData(file, false);
    }
    else
    {
      return Response.ok().build();
    }
  }

  @GET
  @PermitAll
  @Operation(summary = "Get root file")
  public Response get()
  {
    File file = getBaseDir();
    return sendFileProperties(file, "", "1");
  }

  @GET
  @Path("/{path:.*}")
  @PermitAll
  @Operation(summary = "Get file")
  public Response get(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (!file.exists())
      return Response.status(NOT_FOUND).build();

    if (!isValidFile(file))
      return Response.status(METHOD_NOT_ALLOWED).build();

    if (!isAccessAllowed(file, ACL.READ_ACTION))
      return Response.status(FORBIDDEN).build();

    if (file.isFile())
    {
      return sendFileData(file, true);
    }
    else
    {
      return sendFileProperties(file, uri, "1");
    }
  }

  @PUT
  @Path("/{path:.*}")
  @Operation(summary = "Save file")
  public Response put(@PathParam("path") List<PathSegment> path,
    InputStream input)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (!isValidFile(file) || file.isDirectory())
      return Response.status(METHOD_NOT_ALLOWED).build();

    if (!isAccessAllowed(file, ACL.WRITE_ACTION))
      return Response.status(FORBIDDEN).build();

    file.getParentFile().mkdirs();
    try (FileOutputStream output = new FileOutputStream(file))
    {
      IOUtils.copy(input, output);
      return Response.ok().build();
    }
    catch (IOException ex)
    {
      return Response.status(INTERNAL_SERVER_ERROR).build();
    }
  }

  @DELETE
  @Path("/{path:.*}")
  @Operation(summary = "Delete file")
  public Response delete(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (!file.exists())
      return Response.status(NOT_FOUND).build();

    if (!isValidFile(file))
      return Response.status(METHOD_NOT_ALLOWED).build();

    if (!isAccessAllowed(file, ACL.WRITE_ACTION))
      return Response.status(FORBIDDEN).build();

    if (!file.delete())
      return Response.status(METHOD_NOT_ALLOWED).build();

    return Response.ok().build();
  }

  /* private methods */

  private String getPathUri(List<PathSegment> path)
  {
    StringBuilder buffer = new StringBuilder();
    Iterator<PathSegment> iter = path.iterator();
    if (iter.hasNext())
    {
      buffer.append(iter.next());
      while (iter.hasNext())
      {
        buffer.append("/");
        buffer.append(iter.next());
      }
    }
    return buffer.toString();
  }

  private File getBaseDir()
  {
    String baseDirectory = config.getValue(BASE + "directory", String.class);
    File baseDir = new File(baseDirectory);
    if (!baseDir.exists())
    {
      baseDir.mkdirs();
      List<String> folders = config.getValues(BASE + "folders", String.class);
      for (String folder : folders)
      {
        File dir = new File(baseDir, folder);
        dir.mkdir();
      }
    }
    return baseDir;
  }

  private boolean isValidFile(File file)
  {
    return !file.isHidden() && !file.getName().startsWith(".");
  }

  private Response sendFileData(File file, boolean withContent)
  {
    String contentType = getContentType(file);
    long contentLength = file.length();
    Date lastModified = new Date(file.lastModified());
    String etag = "W/\"" + file.length() + "-" + file.lastModified() + "\"";
    CacheControl cacheControl = new CacheControl();
    cacheControl.setNoCache(true);

    ResponseBuilder builder;

    if (withContent)
    {
      String reqEtag = headers.getHeaderString("If-None-Match");
      if (etag.equals(reqEtag))
      {
        builder = Response.status(304);
      }
      else
      {
        StreamingOutput stream = (OutputStream output) ->
        {
          try (FileInputStream input = new FileInputStream(file))
          {
            IOUtils.copy(input, output);
          }
        };
        builder = Response.ok(stream);
      }
    }
    else
    {
      builder = Response.ok();
    }

    return builder.header("Content-Type", contentType)
      .header("Content-Length", contentLength)
      .header("ETag", etag)
      .lastModified(lastModified)
      .cacheControl(cacheControl)
      .build();
  }

  private Response sendFileProperties(File file, String uri, String depth)
  {
    StreamingOutput output = (OutputStream out) ->
    {
      try (PrintWriter writer =
           new PrintWriter(new OutputStreamWriter(out, "UTF-8")))
      {
        writer.write("<?xml version=\"1.0\" encoding=\"utf-8\" ?>");
        writer.write("<D:multistatus xmlns:D=\"DAV:\">");

        writeProperties(file, servletContext.getContextPath() +
          "/api/cloudfs/" + uri,
          depth == null ? "infinity" : depth, writer);
        writer.write("</D:multistatus>");
        writer.flush();
      }
    };
    return Response.ok(output)
			.header("DAV", "1,2")
			.header("Content-Type", TEXT_XML)
      .status(207).build();
  }

  private void writeProperties(File file, String uri, String depth,
     PrintWriter writer) throws IOException
  {
    if (!depth.contains("noroot"))
    {
      writer.write("<D:response><D:href>" + URIEncoder.encode(uri) + "</D:href>");
      writer.write("<D:propstat>");
      writer.write("<D:prop>");
      FileSystem fileSystem = FileSystems.getDefault();
      java.nio.file.Path path = fileSystem.getPath(file.getAbsolutePath());
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
        writer.write("<D:getcontentlength>"+ file.length() +
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

    if (file.isDirectory() && !depth.contains("0"))
    {
      File files[] = file.listFiles();
      depth = depth.contains("1") ? "0" : "infinity";
      if (!uri.endsWith("/")) uri += "/";
      for (File sfile : files)
      {
        if (isValidFile(sfile))
        {
          writeProperties(sfile, uri + sfile.getName(), depth, writer);
        }
      }
    }
  }

  private boolean isAccessAllowed(File file, String action)
  {
    try
    {
      File baseDir = getBaseDir();
      String filename = file.getName();
      File dir = file.getParentFile();
      Set<String> fileRoles = Collections.emptySet();
      while (dir != null)
      {
        ACL acl = ACL.getInstance(dir.getAbsolutePath());
        fileRoles = acl.getRoles(filename, action);
        if (!fileRoles.isEmpty() || dir.equals(baseDir)) break;

        filename = dir.getName();
        dir = dir.getParentFile();
      }
      User user = securityService.getCurrentUser();
      return fileRoles.isEmpty() ||
        !Collections.disjoint(fileRoles, user.getRoleIds());
    }
    catch (Exception ex)
    {
      // ignore
    }
    return false;
  }

  private String getContentType(File file)
  {
    String filename = file.getName();
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
    extension = extension.toLowerCase();
    if (extension.equals("js")) return "text/javascript";
    if (extension.equals("mjs")) return "text/javascript";
    if (extension.equals("txt")) return "text/plain";
    if (extension.equals("json")) return "application/json";
    if (extension.equals("properties")) return "text/plain";
    if (extension.equals("xml")) return "text/xml";
    if (extension.equals("dae")) return "model/vnd.collada+xml";
    if (extension.equals("obj")) return "model/obj";
    if (extension.equals("stl")) return "model/stl";
    if (extension.equals("mtl")) return "model/mtl";
    if (extension.equals("3mf")) return "model/3mf";
    if (extension.equals("ifc")) return "application/x-step";
    if (extension.equals("ifcxml")) return "application/xml";
    if (extension.equals("gltf")) return "model/gltf+json";
    if (extension.equals("glb")) return "model/gltf-binary";

    return "application/octet-stream";
  }
}
