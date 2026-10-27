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
package org.bimrocket.api.security;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.CookieParam;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.TEXT_HTML;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import org.apache.commons.io.IOUtils;
import static org.bimrocket.api.ApiResult.OK;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.expression.io.odata.ODataParser;
import org.bimrocket.service.security.SecurityService;
import static org.bimrocket.service.security.SecurityService.roleFieldMap;
import static org.bimrocket.service.security.SecurityService.userFieldMap;
import static org.bimrocket.api.security.SessionCookieManager.SESSION_COOKIE;
import org.bimrocket.api.security.oauth2.OAuth2Provider;
import org.bimrocket.api.security.oauth2.OAuth2ProviderRegistry;
import org.bimrocket.api.security.oauth2.TokenInfo;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 *
 * @author realor
 */
@Path("security")
@RequestScoped
@Tag(name="Security", description="Security service")
public class SecurityEndpoint
{
  @Inject
  SecurityService securityService;

  @Inject
  OAuth2ProviderRegistry oauth2ProviderRegistry;

  @Inject
  SessionCookieManager sessionCookieManager;

  @Inject
  Config config;

  /* Login */

  @POST
  @Path("/login")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Login")
  public Response login(LoginRequest loginRequest)
  {
    String userId = loginRequest.getUserId();
    String password = loginRequest.getPassword();
    securityService.validateCredentials(userId, password);
    String token = securityService.createToken(userId);
    if (loginRequest.isGenerateCookie())
    {
      NewCookie cookie = sessionCookieManager.createCookie(token);
      return Response.ok().cookie(cookie).build();
    }
    else
    {
      return Response.ok(new LoginResponse(token)).build();
    }
  }

  @GET
  @Path("/logout")
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Logout")
  public Response logout(
    @QueryParam(SESSION_COOKIE) String tokenParam,
    @CookieParam(SESSION_COOKIE) String tokenCookie)
  {
    String token = tokenParam == null ? tokenCookie : tokenParam;
    if (token != null)
    {
      securityService.destroyToken(token);
    }
    return Response.ok(OK)
      .header("Set-Cookie", sessionCookieManager.getDestroyCookieString())
      .build();
  }

  @GET
  @Path("/oauth2/providers")
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "List OAuth2 providers")
  public List<OAuth2ProviderInfo> oauth2Providers()
  {
    List<OAuth2Provider> providers = oauth2ProviderRegistry.getAll();
    List<OAuth2ProviderInfo> providerInfos = new ArrayList<>();
    for (OAuth2Provider provider : providers)
    {
      providerInfos.add(
        new OAuth2ProviderInfo(provider.getName(), provider.getLogoUrl()));
    }
    return providerInfos;
  }

  @GET
  @Path("/oauth2/login/{provider}")
  @Produces(TEXT_HTML)
  @PermitAll
  @Operation(summary = "OAuth2 login")
  public Response oauth2Login(
    @PathParam("provider") String provider,
    @Context UriInfo uriInfo)
    throws Exception
  {
    OAuth2Provider oauthProvider = oauth2ProviderRegistry.get(provider);
    String redirectUri = uriInfo.getRequestUri().toString();
    redirectUri = redirectUri.replaceFirst("/login/", "/token/");
    String url = oauthProvider.getAuthorizationUrl(redirectUri, "");
    return Response.seeOther(new URI(url)).build();
  }

  @GET
  @Path("/oauth2/token/{provider}")
  @Produces(TEXT_HTML)
  @PermitAll
  @Operation(summary = "Get OAuth2 token")
  public Response oauth2ExchangeCode(
    @PathParam("provider") String provider,
    @QueryParam("code") String code,
    @QueryParam("state") String state,
    @Context UriInfo uriInfo)
    throws Exception
  {
    OAuth2Provider oauthProvider = oauth2ProviderRegistry.get(provider);
    String requestUri = uriInfo.getRequestUri().toString();
    TokenInfo tokenInfo = oauthProvider.exchangeCode(code, requestUri);
    User user = oauthProvider.getUser(tokenInfo);
    String userId = user.getId();
    User dbUser = securityService.getUser(userId);
    if (dbUser == null)
    {
      // create new user
      securityService.createUser(user);
    }
    String token = securityService.createToken(userId);
    NewCookie cookie = sessionCookieManager.createCookie(token);
    return Response.ok(getLoginSuccessPage()).cookie(cookie).build();
  }

  /* Users */
  
  @GET
  @Path("/currentUser")
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Get current user")
  public User getCurrrentUser()
  {
    User user = securityService.getCurrentUser();
    user.setPasswordHash(null);
    return user;
  }

  @GET
  @Path("/users")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Get users")
  public List<User> getUsers(@QueryParam("$filter") String odataFilter,
    @QueryParam("$orderBy") String odataOrderBy)
  {
    ODataParser parser = new ODataParser(userFieldMap);
    Expression filter = parser.parseFilter(odataFilter);
    List<OrderByExpression> orderBy = parser.parseOrderBy(odataOrderBy);
    
    return securityService.getUsers(filter, orderBy);
  }

  @GET
  @Path("/users/{userId}")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Get user")
  public User getUser(@PathParam("userId") String userId)
  {
    return securityService.getUser(userId);
  }

  @POST
  @Path("/users")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Create user")
  public User createUser(User user)
  {
    return securityService.createUser(user);
  }

  @PUT
  @Path("/users")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Update user")
  public User updateUser(User user)
  {
    return securityService.updateUser(user);
  }

  @DELETE
  @Path("/users/{userId}")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Delete user")
  public Response deleteUser(@PathParam("userId") String userId)
  {
    securityService.deleteUser(userId);
    return Response.ok(OK).build();
  }

  @POST
  @Path("/users/{userId}/password")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Change password")
  public Response changePassword(@PathParam("userId") String userId,
    ChangePassword changePassword)
  {
    String oldPassword = changePassword.getOldPassword();
    String newPassword = changePassword.getNewPassword();

    securityService.changePassword(userId, oldPassword, newPassword);
    return Response.ok(OK).build();
  }

  /* Roles */

  @GET
  @Path("/roles")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Get roles")
  public List<Role> getRoles(@QueryParam("$filter") String odataFilter,
    @QueryParam("$orderBy") String odataOrderBy)
  {
    ODataParser parser = new ODataParser(roleFieldMap);
    Expression filter = parser.parseFilter(odataFilter);
    List<OrderByExpression> orderBy = parser.parseOrderBy(odataOrderBy);

    return securityService.getRoles(filter, orderBy);
  }

  @GET
  @Path("/roles/{roleId}")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Get role")
  public Role getRole(@PathParam("roleId") String roleId)
  {
    return securityService.getRole(roleId);
  }

  @POST
  @Path("/roles")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Create role")
  public Role createRole(Role role)
  {
    return securityService.createRole(role);
  }

  @PUT
  @Path("/roles")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Update role")
  public Role updateRole(Role role)
  {
    return securityService.updateRole(role);
  }

  @DELETE
  @Path("/roles/{roleId}")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Delete role")
  public Response deleteRole(@PathParam("roleId") String roleId)
  {
    securityService.deleteRole(roleId);
    return Response.ok(OK).build();
  }

  private String getLoginSuccessPage()
  {
    try
    {
      URL resource = this.getClass().getResource("/META-INF/oauth_login.html");
      return IOUtils.toString(resource, "UTF-8");
    }
    catch (IOException ex)
    {
      return ex.toString();
    }
  }
}
