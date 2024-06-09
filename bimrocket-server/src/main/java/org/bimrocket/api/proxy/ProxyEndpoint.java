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
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.OPTIONS;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.container.ContainerRequestContext;
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
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.bimrocket.api.cloudfs.methods.MKCOL;
import org.bimrocket.api.cloudfs.methods.PROPFIND;
import org.bimrocket.util.URIEncoder;

/**
 *
 * @author realor
 */

@Path("proxy")
@Tag(name="Proxy", description="HTTP Proxy service")
public class ProxyEndpoint
{
  private static final Logger LOGGER = Logger.getLogger("Proxy");

	private static final HashSet<String> ignoredHeaders = new HashSet<>();

	static
	{
		ignoredHeaders.add("host");
		ignoredHeaders.add("connection");
		ignoredHeaders.add("content-length");
		ignoredHeaders.add("user-agent");
  }

  @Context
  HttpServletRequest httpServletRequest;

  @Context
  ServletContext servletContext;

  @Context
  ContainerRequestContext context;

  @OPTIONS
  @PermitAll
  public Response options(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
		return doRequest("OPTIONS", url, info, headers);
  }

  @GET
  @PermitAll
  public Response doGet(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
		return doRequest("GET", url, info, headers);
  }

  @POST
  @PermitAll
  public Response doPost(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers, InputStream body)
  {
		return doBodyRequest("POST", url, info, headers, body);
	}

  @PUT
  @PermitAll
  public Response doPut(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers, InputStream body)
  {
		return doBodyRequest("PUT", url, info, headers, body);
	}

  @DELETE
  @PermitAll
  public Response doDelete(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
		return doRequest("DELETE", url, info, headers);
	}

  @PROPFIND
  @PermitAll
  public Response doPropfind(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
		return doRequest("PROPFIND", url, info, headers);
	}

  @MKCOL
  @PermitAll
  public Response doMkcol(@QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
  {
		return doRequest("MKCOL", url, info, headers);
  }

	private Response doRequest(String method, @QueryParam("url") String url,
    @Context UriInfo info, @Context HttpHeaders headers)
	{
    if (url == null) return Response.ok().build();

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
    if (url == null) return Response.ok().build();

    try
    {
			HttpRequest request =
				createRequest(method, url, info, headers,
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
    Object value = servletContext.getInitParameter("proxy.validDomains");
    if (value instanceof String)
    {
      String[] validDomains = ((String)value).split(",");
      for (String validDomain : validDomains)
      {
        if (url.startsWith(validDomain)) return true;
      }
    }
		return !getUserRoles().isEmpty();
  }

  private HttpRequest createRequest(String method,
    String url, UriInfo info, HttpHeaders headers, BodyPublisher body)
    throws Exception
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

      if (alias != null &&
          name.equalsIgnoreCase("Authorization") &&
          "Bearer implicit".equals(value))
      {
        String authoKey = "proxy." + alias + ".authorization";
        String autho = servletContext.getInitParameter(authoKey);
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

    LOGGER.log(Level.INFO, "{0} {1}", new Object[]{ method, targetUrl });

		Response.ResponseBuilder response;
    try
    {
			HttpClient client = HttpClient.newHttpClient();
			HttpResponse<InputStream> clientResponse =
				client.send(request, HttpResponse.BodyHandlers.ofInputStream());

      StreamingOutput output = (OutputStream out) ->
      {
        IOUtils.copy(clientResponse.body(), out);
      };

      response = Response.status(clientResponse.statusCode()).entity(output);

			Map<String, List<String>> headersMap = clientResponse.headers().map();

			for (Map.Entry<String, List<String>> entry : headersMap.entrySet())
			{
				String name = entry.getKey();
				if (name != null &&
						!name.equalsIgnoreCase("Transfer-Encoding") &&
					  !name.toLowerCase().startsWith("access-control"))
				{
					response.header(name, entry.getValue().get(0));
				}
			}
    }
    catch (IOException | InterruptedException ex)
    {
      LOGGER.log(Level.WARNING, "Error connecting to {0}: {1}",
        new Object[]{ targetUrl, ex });
      response = Response.serverError().entity(ex.toString());
    }
    return response.build();
  }

  @SuppressWarnings("unchecked")
  private Set<String> getUserRoles()
  {
    Object value = context.getProperty("userRoles");
    return value == null ? Collections.emptySet() : (Set<String>)value;
  }
}
