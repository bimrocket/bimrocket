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
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import jakarta.ws.rs.core.UriInfo;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import org.apache.commons.io.IOUtils;

/**
 *
 * @author realor
 */

@Path("proxy")
@Tag(name="Proxy", description="HTTP Proxy service")
public class ProxyEndpoint
{
  @GET
  @PermitAll
  public Response doGet(@QueryParam("url") String url, @Context UriInfo info)
  {
    if (url == null) return Response.ok().build();

    StringBuilder buffer = new StringBuilder(url);
    boolean firstParam = true;
    MultivaluedMap<String, String> queryParameters = info.getQueryParameters();
    for (String name : queryParameters.keySet())
    {
      if (!name.equals("url"))
      {
        List<String> values = queryParameters.get(name);
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
          buffer.append(name).append("=").append(value);
        }
      }
    }
    try
    {
      URL targetUrl = new URL(buffer.toString());
      System.out.println("Connecting to " + targetUrl);
      HttpURLConnection conn = (HttpURLConnection)targetUrl.openConnection();
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

      String contentType = conn.getContentType();
      int pos = contentType.indexOf(";");
      if (pos != -1)
      {
        contentType = contentType.substring(0, pos);
      }

      StreamingOutput output = (OutputStream out) ->
      {
        IOUtils.copy(is, out);
      };

      return Response.ok(output).header("Content-Type", contentType).build();
    }
    catch (Exception ex)
    {
      return Response.serverError().entity(ex.toString()).build();
    }
  }
}
