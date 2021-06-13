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
package org.bimrocket.api.cloudfs;

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
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Application;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.PathSegment;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.Status;
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
import static jakarta.ws.rs.core.MediaType.TEXT_XML;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.file.FileSystem;

/**
 *
 * @author realor
 */
@Path("cloudfs")
@Tag(name="CloudFS", description="Cloud File System")
public class CloudFsEndpoint
{
  public static final String BASE_PROPERTY = "cloudfs.baseProperty";
  public static final String BASE_DIRECTORY = "cloudfs.baseDirectory";
  public static final String ACL_FILENAME = "acl.properties";

  @Inject
  Application application;

  @Context
  ContainerRequestContext context;

  @Context
  ServletContext servletContext;
  
  @OPTIONS
  public Response options()
  {
    return Response.ok()
      .header("DAV", "1,2")
      .header("Allow", "HEAD,GET,PUT,DELETE,OPTIONS,PROPFIND,MKCOL")
      .build();
  }

  @PROPFIND
  @Path("/{path:.*}")
  @PermitAll
  @Produces(TEXT_XML)
  public Response propfind(@PathParam("path") List<PathSegment> path,
    @HeaderParam("depth") String depth)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);
    
    if (isValidFile(file))
    {
      StreamingOutput output = (OutputStream out) ->
      {
        try (PrintWriter writer = 
             new PrintWriter(new OutputStreamWriter(out, "UTF-8")))
        {
          writer.write("<?xml version=\"1.0\" encoding=\"utf-8\" ?>");
          writer.write("<D:multistatus xmlns:D=\"DAV:\">");
          
          sendProperties(file, servletContext.getContextPath() + 
            "/api/cloudfs/" + uri, 
            depth == null ? "infinity" : depth, writer);
          writer.write("</D:multistatus>");
          writer.flush();
        }
      };
      return Response.ok(output).status(207).build();
    }
    else
    {
      return Response.status(Status.NOT_FOUND).build();
    }
  }

  @MKCOL
  @Path("/{path:.*}")
  @PermitAll
  public Response mkcol(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (file.exists())
      return Response.status(Status.NOT_ACCEPTABLE).build();

    file.mkdirs();

    return Response.status(Status.CREATED).build();
  }

  @HEAD
  @Path("/{path:.*}")
  @PermitAll
  public Response head(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);
    
    if (isValidFile(file))
    {
      if (file.isFile())
      {
        return sendFile(file, false);        
      }
      else
      {
        return Response.ok().build();                
      }
    }
    else
    {
      return Response.status(Status.NOT_FOUND).build();
    }
  }

  @GET
  @Path("/{path:.*}")
  @PermitAll
  public Response get(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);
    
    if (isValidFile(file))
    {
      if (file.isFile())
      {
        return sendFile(file, true);
      }
      else
      {
        return Response.ok().build();        
      }
    }
    else
    {
      return Response.status(Status.NOT_FOUND).build();
    }
  }

  @PUT
  @Path("/{path:.*}")
  @PermitAll
  public Response put(@PathParam("path") List<PathSegment> path, 
    InputStream input)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (file.exists() && file.isDirectory())
      return Response.status(Status.NOT_ACCEPTABLE).build();

    file.getParentFile().mkdirs();
    try (FileOutputStream output = new FileOutputStream(file))
    {
      IOUtils.copy(input, output);
      return Response.ok().build();
    }
    catch (IOException ex)
    {
      return Response.status(Status.INTERNAL_SERVER_ERROR).build(); 
    }
  }

  @DELETE
  @Path("/{path:.*}")
  @PermitAll
  public Response delete(@PathParam("path") List<PathSegment> path)
  {
    String uri = getPathUri(path);
    File file = new File(getBaseDir(), uri);

    if (file.exists())
    {
      file.delete();
    }
    
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
    String baseProperty = servletContext.getInitParameter(BASE_PROPERTY);
    String baseDirectory = servletContext.getInitParameter(BASE_DIRECTORY);
    String basePath = System.getProperty(baseProperty);
    File baseDir = new File(basePath, baseDirectory);
    if (!baseDir.exists())
    {
      baseDir.mkdirs();
    }
    return baseDir;
  }  

  private boolean isValidFile(File file)
  {
    return file.exists() && !file.isHidden() && !file.getName().startsWith(".");
  }

  private Response sendFile(File file, boolean content)
  {
    String contentType = getContentType(file);
    long contentLength = file.length();
    
    if (content)
    {
      StreamingOutput stream = (OutputStream output) ->
      {
        try (FileInputStream input = new FileInputStream(file))
        {
          IOUtils.copy(input, output);
        }
      };
      return Response.ok(stream)
        .header("Content-Type", contentType)
        .header("Content-Length", contentLength)
        .build();
    }
    else
    {
      return Response.ok()
        .header("Content-Type", contentType)
        .header("Content-Length", contentLength)
        .build();
    }
  }
  
  private void sendProperties(File file, String uri, String depth,
     PrintWriter writer) throws IOException
  {
    if (!depth.contains("noroot"))
    {
      writer.write("<D:response><D:href>" + uri + "</D:href>");
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
          sendProperties(sfile, uri + sfile.getName(), depth, writer);
        }
      }
    }
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

    return "application/octet-stream";
  }  
}
