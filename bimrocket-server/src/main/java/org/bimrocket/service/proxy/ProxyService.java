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
package org.bimrocket.service.proxy;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublisher;
import java.net.http.HttpResponse;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.bimrocket.api.security.User;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.URIEncoder;
import org.eclipse.microprofile.config.Config;
import static org.bimrocket.service.security.SecurityConstants.AUTHENTICATED_ROLE;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class ProxyService
{
  static final Logger LOGGER = Logger.getLogger(ProxyService.class.getName());

  static final String BASE = "services.proxy.";

  static final HashSet<String> ignoredHeaders = new HashSet<>();

  static
  {
    ignoredHeaders.add("host");
    ignoredHeaders.add("connection");
    ignoredHeaders.add("content-length");
    ignoredHeaders.add("user-agent");
  }

  @Inject
  SecurityService securityService;

  @Inject
  Config config;

  HttpClient httpClient;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init ProxyService");

    httpClient = HttpClient.newBuilder()
      .version(HttpClient.Version.HTTP_1_1)
      .build();
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "Destroying ProxyService");

    // httpClient shutdowns its internal thread when it is no longer referenced
    // A GC is performed to release the httpClient.
    // In JDK21 this could be replaced by a call to the httpClient.close()
    // method which was introduced to stop this thread.

    httpClient = null;
    System.gc();

    try
    {
      Thread.sleep(5000);
    }
    catch (InterruptedException ex)
    {
    }
  }

  public void service(HttpServletRequest servletRequest,
    HttpServletResponse servletResponse) throws Exception
  {
    String url = servletRequest.getParameter("url");
    if (url == null)
    {
      servletResponse.getWriter().print("proxy service");
    }
    else
    {
      HttpRequest request = createRequest(url, servletRequest);

      HttpResponse<InputStream> httpResponse =
        httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

      sendResponse(httpResponse, servletResponse);
    }
  }

  /* private */

  private HttpRequest createRequest(String url,
    HttpServletRequest servletRequest) throws Exception
  {
    String alias;
    String remoteAddr = servletRequest.getRemoteAddr();

    // get and validate url
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
      if (ipFilter != null && !remoteAddr.startsWith(ipFilter))
      {
        throw new AccessDeniedException("Not authorized remote ip: " + remoteAddr);
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
    StringBuilder uriBuffer = new StringBuilder(encodedUrl);
    boolean firstParam = true;

    Map<String, String[]> parameterMap = servletRequest.getParameterMap();

    // add parameters to url
    for (String name : parameterMap.keySet())
    {
      if (!name.equals("url"))
      {
        String[] values = parameterMap.get(name);
        for (String value : values)
        {
          if (firstParam)
          {
            uriBuffer.append("?");
            firstParam = false;
          }
          else
          {
            uriBuffer.append("&");
          }
          String encodedName = URLEncoder.encode(name, "UTF-8");
          String encodedValue = URLEncoder.encode(value, "UTF-8");
          uriBuffer.append(encodedName).append("=").append(encodedValue);
        }
      }
    }

    String method = servletRequest.getMethod().toUpperCase();

    // set body
    InputStream is = "POST".equals(method) || "PUT".equals(method) ?
      servletRequest.getInputStream() : null;

    BodyPublisher body = is == null ?
      HttpRequest.BodyPublishers.noBody() :
      HttpRequest.BodyPublishers.ofInputStream(() -> is);

    HttpRequest.Builder builder = HttpRequest.newBuilder()
      .uri(new URI(uriBuffer.toString()))
      .method(method, body);

    // set headers
    setHttpHeaders(builder, servletRequest, alias);
    builder.header("X-Forwarded-For", remoteAddr);
    return builder.build();
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

  private void setHttpHeaders(HttpRequest.Builder builder,
    HttpServletRequest servletRequest, String alias)
  {
    Enumeration<String> headerNames = servletRequest.getHeaderNames();
    while (headerNames.hasMoreElements())
    {
      String name = headerNames.nextElement();
      String value = servletRequest.getHeader(name);

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

  private void sendResponse(HttpResponse<InputStream> httpResponse,
    HttpServletResponse servletResponse)
    throws Exception
  {
    Map<String, List<String>> headersMap = httpResponse.headers().map();

    servletResponse.setStatus(httpResponse.statusCode());

    for (Map.Entry<String, List<String>> entry : headersMap.entrySet())
    {
      String name = entry.getKey();
      if (name != null
        && !name.equalsIgnoreCase("Transfer-Encoding")
        && !name.toLowerCase().startsWith("access-control"))
      {
        servletResponse.setHeader(name, entry.getValue().get(0));
      }
    }

    try (OutputStream os = servletResponse.getOutputStream())
    {
      IOUtils.copy(httpResponse.body(), os);
      os.flush();
    }
  }
}
