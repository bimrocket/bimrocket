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
package org.bimrocket.api.proxy;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.OPTIONS;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
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
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublisher;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.bimrocket.api.cloudfs.methods.MKCOL;
import org.bimrocket.api.cloudfs.methods.PROPFIND;
import org.bimrocket.api.security.User;
import org.bimrocket.exception.AccessDeniedException;
import static org.bimrocket.service.security.SecurityConstants.AUTHENTICATED_ROLE;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.URIEncoder;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
@Path("proxy")
@Tag(name = "Proxy", description = "HTTP Proxy service")
public class ProxyEndpoint
{
  static final Logger LOGGER = Logger.getLogger("Proxy");

  static final String BASE = "proxy.";

  static final HashSet<String> ignoredHeaders = new HashSet<>();

  static
  {
    ignoredHeaders.add("host");
    ignoredHeaders.add("connection");
    ignoredHeaders.add("content-length");
    ignoredHeaders.add("user-agent");
  }

  @Context
  HttpServletRequest httpServletRequest;

  @Inject
  SecurityService securityService;

  @Inject
  Config config;

  @OPTIONS
  @PermitAll
  @Operation(summary = "Proxy HTTP OPTIONS request")
  public Response options(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    return doRequest("OPTIONS", url, info, headers);
  }

  @GET
  @PermitAll
  @Operation(summary = "Proxy HTTP GET request")
  public Response doGet(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    return doRequest("GET", url, info, headers);
  }

  @POST
  @PermitAll
  @Operation(summary = "Proxy HTTP POST request")
  public Response doPost(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers, InputStream body)
  {
    return doBodyRequest("POST", url, info, headers, body);
  }

  @PUT
  @PermitAll
  @Operation(summary = "Proxy HTTP PUT request")
  public Response doPut(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers, InputStream body)
  {
    return doBodyRequest("PUT", url, info, headers, body);
  }

  @DELETE
  @PermitAll
  @Operation(summary = "Proxy HTTP DELETE request")
  public Response doDelete(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    return doRequest("DELETE", url, info, headers);
  }

  @PROPFIND
  @PermitAll
  @Operation(summary = "Proxy HTTP PROPFIND request")
  public Response doPropfind(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    return doRequest("PROPFIND", url, info, headers);
  }

  @MKCOL
  @PermitAll
  @Operation(summary = "Proxy HTTP MKCOL request")
  public Response doMkcol(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    return doRequest("MKCOL", url, info, headers);
  }

  private Response doRequest(String method, @QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
    if (url == null)
    {
      return Response.ok().build();
    }

    try
    {
      HttpRequest request =
        createRequest(method, url, info, headers, BodyPublishers.noBody());

      return send(request);
    }
    catch (Exception ex)
    {
      return Response.serverError().entity(ex.toString()).build();
    }
  }

  private Response doBodyRequest(String method, @QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers, InputStream body)
  {
    if (url == null)
    {
      return Response.ok().build();
    }

    try
    {
      HttpRequest request = createRequest(method, url, info, headers,
        BodyPublishers.ofInputStream(() -> body));

      return send(request);
    }
    catch (Exception ex)
    {
      return Response.serverError().entity(ex.toString()).build();
    }
  }

  private boolean isValidUrl(String url)
  {
    List<String> validUrls =
      config.getValues(BASE + "validUrls", String.class);

    for (String validUrl : validUrls)
    {
      if (url.startsWith(validUrl))
      {
        return true;
      }
    }

    User user = securityService.getCurrentUser();
    return user.getRoleIds().contains(AUTHENTICATED_ROLE);
  }

  private HttpRequest createRequest(String method,
    String url, UriInfo info, HttpHeaders headers, BodyPublisher body)
    throws Exception
  {
    String alias;

    if (url.startsWith("@"))
    {
      alias = url.substring(1);

      String aliasBase = BASE + "aliases." + alias + ".";

      url = config.getOptionalValue(aliasBase + "url", String.class).orElse(null);
      if (url == null)
      {
        throw new IOException("Invalid alias url: " + alias);
      }

      String ipFilter =
        config.getOptionalValue(aliasBase + ".ipfilter", String.class).orElse(null);
      String addr = httpServletRequest.getRemoteAddr();
      if (ipFilter != null && !addr.startsWith(ipFilter))
      {
        throw new AccessDeniedException("Not authorized remote ip: " + addr);
      }
    }
    else
    {
      alias = null;

      if (!isValidUrl(url))
      {
        throw new AccessDeniedException("Access forbidden to " + url);
      }
    }

    String encodedUrl = URIEncoder.encode(url);
    StringBuilder buffer = new StringBuilder(encodedUrl);
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
          String encodedName = URLEncoder.encode(name, "UTF-8");
          String encodedValue = URLEncoder.encode(value, "UTF-8");
          buffer.append(encodedName).append("=").append(encodedValue);
        }
      }
    }

    HttpRequest.Builder builder = HttpRequest.newBuilder()
      .uri(new URI(buffer.toString()))
      .method(method, body);

    setHttpHeaders(builder, headers, alias);
    builder.header("X-Forwarded-For",
      httpServletRequest.getRemoteAddr());
    return builder.build();
  }

  private void setHttpHeaders(HttpRequest.Builder builder,
    HttpHeaders headers, String alias)
  {
    MultivaluedMap<String, String> map = headers.getRequestHeaders();
    for (String name : map.keySet())
    {
      String value = map.getFirst(name);

      if (alias != null
        && name.equalsIgnoreCase("Authorization")
        && "Bearer implicit".equals(value))
      {
        String authoKey = BASE + "aliases." + alias + ".authorization";
        String autho = config.getOptionalValue(authoKey, String.class).orElse(null);
        if (autho != null)
        {
          builder.header("Authorization", autho);
        }
      }
      else
      {
        if (name.equalsIgnoreCase("Forwarded-Authorization"))
        {
          builder.header("Authorization", value);
        }
        else if (!ignoredHeaders.contains(name.toLowerCase()))
        {
          builder.header(name, value);
        }
      }
    }
  }

  private Response send(HttpRequest request) throws Exception
  {
    String method = request.method();
    String targetUrl = request.uri().toString();

    LOGGER.log(Level.INFO, "{0} {1}", new Object[] { method, targetUrl });

    Response.ResponseBuilder response;
    try
    {
      HttpClient client = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();

      HttpResponse<InputStream> clientResponse
        = client.send(request, HttpResponse.BodyHandlers.ofInputStream());

      StreamingOutput output = (OutputStream out) ->
      {
        IOUtils.copy(clientResponse.body(), out);
      };

      response = Response.status(clientResponse.statusCode()).entity(output);

      Map<String, List<String>> headersMap = clientResponse.headers().map();

      for (Map.Entry<String, List<String>> entry : headersMap.entrySet())
      {
        String name = entry.getKey();
        if (name != null
          && !name.equalsIgnoreCase("Transfer-Encoding")
          && !name.toLowerCase().startsWith("access-control"))
        {
          response.header(name, entry.getValue().get(0));
        }
      }
    }
    catch (IOException | InterruptedException ex)
    {
      LOGGER.log(Level.WARNING, "Error connecting to {0}: {1}",
        new Object[] { targetUrl, ex });
      response = Response.serverError().entity(ex.toString());
    }
    return response.build();
  }
}
