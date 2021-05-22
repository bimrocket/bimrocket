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
package org.bimrocket.api;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Application;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import org.bimrocket.security.UserStore;

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
    UserStore userStore =
      (UserStore)application.getProperties().get("userStore");
    if (userStore == null) return;

    String username = null;
    String password = null;

    List<String> authos = context.getHeaders().get("Authorization");
    if (authos != null && !authos.isEmpty())
    {
      String autho = authos.get(0);
      String[] authoParts = autho.split(" ");
      if (authoParts.length == 2 && authoParts[0].equalsIgnoreCase("basic"))
      {
        String userPassword = authoParts[1].trim();
        String decoded = new String(Base64.getDecoder().decode(userPassword));
        String[] userPasswordParts = decoded.split(":");
        username = userPasswordParts[0];
        password = userPasswordParts.length > 1 ? userPasswordParts[1] : null;
      }
    }
    
    Set<String> userRoles = userStore.getRoles(username);

    if (username != null)
    {
      if (userStore.validateCredential(username, password))
      {
        context.setProperty("username", username);
        context.setProperty("userRoles", userRoles);
      }
      else
      {
        context.abortWith(ApiError.response(401, "Invalid credentials"));
        return;
      }
    }

    Method method = resourceInfo.getResourceMethod();
    if (!isValidResource(method, userRoles))
    {
      context.abortWith(ApiError.response(403, "Access denied"));
    }
  }

  private boolean isValidResource(Method method, Set<String> userRoles)
  {
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
    
    return !userRoles.isEmpty();
  }
}
