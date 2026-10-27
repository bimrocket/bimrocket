/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2026, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.rest.filter;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Cookie;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import org.bimrocket.api.ApiResult;
import java.util.Collections;
import java.util.Set;
import org.bimrocket.api.security.User;
import org.bimrocket.exception.NotAuthorizedException;
import org.bimrocket.service.security.SecurityService;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.TEXT_XML;
import static org.bimrocket.service.security.SecurityConstants.ANONYMOUS_USER;
import static org.bimrocket.service.security.SecurityConstants.AUTHENTICATED_ROLE;
import org.bimrocket.api.security.SessionCookieManager;
import static org.bimrocket.api.security.SessionCookieManager.SESSION_COOKIE;
import org.bimrocket.rest.RequestContext;
import org.bimrocket.service.security.Credentials;
import static org.bimrocket.service.security.Credentials.COOKIE;

/**
 *
 * @author realor
 */
@Provider
@RequestScoped
public class AuthorizationFilter
  implements ContainerRequestFilter, ContainerResponseFilter
{
  @Context
  private ResourceInfo resourceInfo;

  @Inject
  RequestContext requestContext;

  @Inject
  SecurityService securityService;

  @Inject
  SessionCookieManager sessionCookieManager;

  @Override
  public void filter(ContainerRequestContext context) throws IOException
  {
    Credentials credentials = null;

    // set Credentials
    String authorization = context.getHeaderString("Authorization");
    if (authorization != null)
    {
      credentials = fromAuthorization(authorization);
    }
    else
    {
      Cookie cookie = context.getCookies().get(SESSION_COOKIE);
      if (cookie != null)
      {
        credentials = fromCookie(cookie);
      }
    }
    requestContext.setCredentials(credentials);

    // check method authorization
    if ("OPTIONS".equals(context.getMethod())) return;

    Method method = resourceInfo.getResourceMethod();

    if (method.isAnnotationPresent(PermitAll.class)) return;

    User user;
    try
    {
      user = securityService.getCurrentUser();

      if (ANONYMOUS_USER.equals(user.getId()))
        throw new NotAuthorizedException();
    }
    catch (NotAuthorizedException ex)
    {
      context.abortWith(getErrorResponse(401, ex.getMessage()));
      return;
    }

    RolesAllowed rolesAllowed = method.getAnnotation(RolesAllowed.class);
    Set<String> allowedRoleIds = rolesAllowed == null ?
      Set.of(AUTHENTICATED_ROLE) : Set.of(rolesAllowed.value());

    if (Collections.disjoint(allowedRoleIds, user.getRoleIds()))
    {
      context.abortWith(getErrorResponse(403, "Access denied."));
    }
  }

  @Override
  public void filter(ContainerRequestContext requestContext,
    ContainerResponseContext responseContext)
    throws IOException
  {
    if (responseContext.getStatus() == 401)
    {
      // Check AJAX request
      String requestedWith = requestContext.getHeaderString("X-Requested-With");

      // Send WWW-Authenticate header for AJAX requests only
      if ("XMLHttpRequest".equalsIgnoreCase(requestedWith) ||
          "Fetch".equalsIgnoreCase(requestedWith))
      {
        // Ensure header is absent for AJAX
        responseContext.getHeaders().remove(HttpHeaders.WWW_AUTHENTICATE);
      }
      else
      {
        responseContext.getHeaders().putSingle(
          HttpHeaders.WWW_AUTHENTICATE, "Basic realm=\"Bimrocket\"");
      }
    }
  }

  private Response getErrorResponse(int statusCode, String message)
  {
    Method method = resourceInfo.getResourceMethod();

    Produces produces = method.getAnnotation(Produces.class);
    if (produces != null)
    {
      String[] producesValue = produces.value();
      List<String> contentTypes = Arrays.asList(producesValue);
      if (contentTypes.contains(APPLICATION_JSON))
      {
        ApiResult error = new ApiResult(statusCode, message);
        return Response.status(statusCode).entity(error).build();
      }
      else if (contentTypes.contains(TEXT_XML))
      {
        StringBuilder buffer = new StringBuilder();
        buffer.append("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
        buffer.append("<error>");
        buffer.append("<code>").append(statusCode).append("</code>");
        buffer.append("<message>").append(message).append("</message>");
        buffer.append("</error>");
        return Response.status(statusCode).entity(buffer.toString()).build();
      }
    }
    return Response.status(statusCode, message).build();
  }

  private Credentials fromAuthorization(String authorization)
  {
    String type;
    String value;

    authorization = authorization.trim();
    int index = authorization.indexOf(' ');
    if (index != -1)
    {
      type = authorization.substring(0, index).toLowerCase();
      value = authorization.substring(index + 1).trim();
    }
    else
    {
      type = "";
      value = authorization;
    }
    return new Credentials(type, value);
  }

  private Credentials fromCookie(Cookie cookie)
  {
    return new Credentials(COOKIE, cookie.getValue());
  }
}