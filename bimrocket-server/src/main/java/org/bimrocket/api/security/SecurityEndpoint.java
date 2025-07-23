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
package org.bimrocket.api.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import jakarta.ws.rs.core.Response;
import java.util.List;
import static org.bimrocket.api.ApiResult.OK;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.expression.io.odata.ODataParser;
import org.bimrocket.service.security.SecurityService;
import static org.bimrocket.service.security.SecurityService.roleFieldMap;
import static org.bimrocket.service.security.SecurityService.userFieldMap;

/**
 *
 * @author realor
 */
@Path("security")
@Tag(name="Security", description="Security service")
public class SecurityEndpoint
{
  @Inject
  SecurityService securityService;

  /* Users */

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
}
