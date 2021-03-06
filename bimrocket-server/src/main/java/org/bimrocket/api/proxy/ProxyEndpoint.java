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
import org.apache.commons.io.IOUtils;

/**
 *
 * @author realor
 */

@Path("proxy")
@Tag(name="Proxy", description="HTTP Proxy service")
public class ProxyEndpoint
{
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
      if (!isValidUrl(url))
        throw new SecurityException("Access forbidden to " + url);

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
      System.out.println("Connecting to " + targetUrl);
      HttpURLConnection conn = (HttpURLConnection)targetUrl.openConnection();
      conn.setRequestProperty("X-Forwarded-For",
        httpServletRequest.getRemoteAddr());

      conn.connect();

      InputStream responseStream;
      try
      {
        responseStream = conn.getInputStream();
      }
      catch (IOException ex)
      {
        responseStream = conn.getErrorStream();
      }
      InputStream is = responseStream;

      StreamingOutput output = (OutputStream out) ->
      {
        IOUtils.copy(is, out);
      };

      Response.ResponseBuilder response = Response.ok(output);
      Map<String, List<String>> responseHeaders = conn.getHeaderFields();
      for (Map.Entry<String, List<String>> entry : responseHeaders.entrySet())
      {
        if (entry.getKey() != null)
        {
          response.header(entry.getKey(), entry.getValue().get(0));
        }
      }
      return response.build();
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
}
