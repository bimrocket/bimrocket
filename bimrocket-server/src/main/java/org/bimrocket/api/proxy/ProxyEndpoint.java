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
package org.bimrocket.api.proxy;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import jakarta.ws.rs.core.UriInfo;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;

/**
 *
 * @author realor
 */

@Path("proxy")
@Tag(name="Proxy", description="HTTP Proxy service")
public class ProxyEndpoint
{
  private static Logger LOGGER = Logger.getLogger("Proxy");

  @Context
  HttpServletRequest httpServletRequest;

  @Context
  ServletContext servletContext;

  @GET
  @PermitAll
  public Response doGet(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    if (url == null) return Response.ok().build();

    try
    {
      HttpURLConnection conn = connect("GET", url, info, headers);

      return getResponse(conn);
    }
    catch (Exception ex)
    {
      return Response.serverError().entity(ex.toString()).build();
    }
  }

  @POST
  @PermitAll
  public Response doPost(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers, InputStream body)
  {
    if (url == null) return Response.ok().build();

    try
    {
      HttpURLConnection conn = connect("POST", url, info, headers);
      conn.setDoOutput(true);

      try (OutputStream outputStream = conn.getOutputStream())
      {
        IOUtils.copy(body, outputStream);
      }

      return getResponse(conn);
    }
    catch (Exception ex)
    {
      return Response.serverError().entity(ex.toString()).build();
    }
  }

  private boolean isValidUrl(String url)
  {
    Object value = servletContext.getInitParameter("proxy.validDomains");
    if (value instanceof String)
    {
      String[] validDomains = ((String)value).split(",");
      for (String validDomain : validDomains)
      {
        if (url.startsWith(validDomain)) return true;
      }
    }
    return false;
  }

  private HttpURLConnection connect(String method,
    String url, UriInfo info, HttpHeaders headers)
    throws IOException
  {
    String alias;

    if (url.startsWith("@"))
    {
      alias = url.substring(1);

      url = servletContext.getInitParameter("proxy." + alias + ".url");
      if (url == null) throw new IOException("Invalid url alias: " + alias);

      String ipFilterKey = "proxy." + alias + ".ipfilter";
      String ipFilter = servletContext.getInitParameter(ipFilterKey);
      String addr = httpServletRequest.getRemoteAddr();
      if (ipFilter != null && !addr.startsWith(ipFilter))
        throw new SecurityException("Not authorized remote ip: " + addr);
    }
    else
    {
      alias = null;

      if (!isValidUrl(url))
        throw new SecurityException("Access forbidden to " + url);
    }

    StringBuilder buffer = new StringBuilder(url);
    boolean firstParam = true;

    MultivaluedMap<String, String> queryParams = info.getQueryParameters();
    for (String name : queryParams.keySet())
    {
      if (!name.equals("url"))
      {
        List<String> values = queryParams.get(name);
        for (String value : values)
        {
          if (firstParam)
          {
            buffer.append("?");
            firstParam = false;
          }
          else
          {
            buffer.append("&");
          }
          String encodedValue = URLEncoder.encode(value, "UTF-8");
          buffer.append(name).append("=").append(encodedValue);
        }
      }
    }
    URL targetUrl = new URL(buffer.toString());

    HttpURLConnection conn = (HttpURLConnection)targetUrl.openConnection();
    setHttpHeaders(conn, headers, alias);
    conn.setRequestProperty("X-Forwarded-For",
      httpServletRequest.getRemoteAddr());
    conn.setRequestMethod(method);
    return conn;
  }

  private void setHttpHeaders(HttpURLConnection conn,
    HttpHeaders headers, String alias)
  {
    MultivaluedMap<String, String> map = headers.getRequestHeaders();
    for (String name : map.keySet())
    {
      String value = map.getFirst(name);

      if (alias != null &&
          name.equalsIgnoreCase("Authorization") &&
          "Bearer implicit".equals(value))
      {
        String authoKey = "proxy." + alias + ".authorization";
        String autho = servletContext.getInitParameter(authoKey);
        if (autho != null)
        {
          conn.setRequestProperty("Authorization", autho);
        }
      }
      else
      {
        conn.setRequestProperty(name, value);
      }
    }
  }

  private Response getResponse(HttpURLConnection conn) throws Exception
  {
    String targetUrl = conn.getURL().toString();
    Response.ResponseBuilder response;
    try
    {
      InputStream inputStream = conn.getInputStream();
      LOGGER.log(Level.INFO, "Connected to {0}", targetUrl);
      StreamingOutput output = (OutputStream out) ->
      {
        IOUtils.copy(inputStream, out);
      };
      response = Response.ok(output);
    }
    catch (IOException ex)
    {
      LOGGER.log(Level.WARNING, "Error connecting to {0}: {1}",
        new Object[]{ targetUrl, ex });
      int status = conn.getResponseCode();
      InputStream errorStream = conn.getErrorStream();
      if (errorStream == null)
      {
        response = Response.status(status, ex.toString());
      }
      else
      {
        StreamingOutput output = (OutputStream out) ->
        {
          IOUtils.copy(errorStream, out);
        };
        response = Response.status(status).entity(output);
      }
    }

    Map<String, List<String>> responseHeaders = conn.getHeaderFields();
    for (Map.Entry<String, List<String>> entry : responseHeaders.entrySet())
    {
      if (entry.getKey() != null &&
          !entry.getKey().equalsIgnoreCase("Transfer-Encoding"))
      {
        response.header(entry.getKey(), entry.getValue().get(0));
      }
    }
    return response.build();
  }
}
