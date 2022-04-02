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
package org.bimrocket.config;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Application;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import org.bimrocket.api.ApiError;
import org.bimrocket.security.UserStore;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.TEXT_XML;
import static org.bimrocket.security.UserStore.ANONYMOUS_USER;

/**
 *
 * @author realor
 */
@Provider
public class AuthenticationFilter implements ContainerRequestFilter
{
  @Inject
  Application application;

  @Context
  private ResourceInfo resourceInfo;

  @Override
  public void filter(ContainerRequestContext context) throws IOException
  {
    if ("OPTIONS".equals(context.getMethod())) return;

    UserStore userStore =
      (UserStore)application.getProperties().get("userStore");
    if (userStore == null) return;

    String username = ANONYMOUS_USER;

    List<String> authos = context.getHeaders().get("Authorization");
    if (authos != null && !authos.isEmpty())
    {
      String autho = authos.get(0);
      String[] authoParts = autho.split(" ");

      // basic authentication
      if (authoParts.length == 2 && authoParts[0].equalsIgnoreCase("basic"))
      {
        String userPassword = authoParts[1].trim();
        String decoded = new String(Base64.getDecoder().decode(userPassword));
        String[] userPasswordParts = decoded.split(":");
        username = userPasswordParts[0];
        String password = userPasswordParts.length > 1 ?
          userPasswordParts[1] : null;
        if (!userStore.validateCredential(username, password))
        {
          context.abortWith(getErrorResponse(401, "Invalid credentials"));
          return;
        }
      }
    }

    context.setProperty("username", username);

    Set<String> userRoles = userStore.getRoles(username);
    context.setProperty("userRoles", userRoles);

    if (!isAccessAllowed(username, userRoles))
    {
      context.abortWith(getErrorResponse(403, "Access denied"));
    }
  }

  private boolean isAccessAllowed(String username, Set<String> userRoles)
  {
    Method method = resourceInfo.getResourceMethod();

    if (method.isAnnotationPresent(PermitAll.class)) return true;

    RolesAllowed rolesAllowed = method.getAnnotation(RolesAllowed.class);
    if (rolesAllowed != null)
    {
      String[] roles = rolesAllowed.value();
      for (String role : roles)
      {
        if (userRoles.contains(role)) return true;
      }
      return false;
    }

    // only authenticated users can access methods with no roles defined
    return !ANONYMOUS_USER.equals(username);
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
        ApiError error = new ApiError(statusCode, message);
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
}
