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
package org.bimrocket.api.task;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import org.bimrocket.service.task.TaskService;
import org.bimrocket.api.ApiResult;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import java.util.List;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.expression.io.odata.ODataParser;
import static org.bimrocket.service.task.TaskService.executionFieldMap;

/**
 *
 * @author realor
 */
@Path("task")
@Tag(name="Task", description="Task service")
public class TaskEndpoint
{
  @Inject
  TaskService taskService;

  @GET
  @Path("/executions")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Get task executions")
  public List<TaskExecution> getTaskExecutions(
    @QueryParam("$filter") String odataFilter,
    @QueryParam("$orderBy") String odataOrderBy)
  {
    ODataParser parser = new ODataParser(executionFieldMap);
    Expression filter = parser.parseFilter(odataFilter);
    List<OrderByExpression> orderBy = parser.parseOrderBy(odataOrderBy);

    return taskService.getTaskExecutions(filter, orderBy);
  }

  @GET
  @Path("/executions/{executionId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Get task execution")
  public TaskExecution getTaskExecution(
    @PathParam("executionId") String executionId,
    @QueryParam("waitMillis") long waitMillis)
  {
    return taskService.getTaskExecution(executionId, waitMillis);
  }

  @PUT
  @Path("/executions")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Execute task")
  public TaskExecution executeTask(TaskInvocation invocation)
  {
    return taskService.executeTask(invocation);
  }

  @DELETE
  @Path("/executions/{executionId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @PermitAll
  @Operation(summary = "Cancel task execution")
  public ApiResult cancelTaskExecution(
    @PathParam("executionId") String executionId)
  {
    boolean cancelled = taskService.cancelTaskExecution(executionId);
    return new ApiResult(200, cancelled ? "Cancelled" : "Not cancelled");
  }

  @GET
  @Path("/data/{dataId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Load task data")
  public TaskData loadTaskData(@PathParam("dataId") String dataId)
  {
    return taskService.loadTaskData(dataId);
  }

  @PUT
  @Path("/data")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Save task data")
  public TaskData saveTaskData(TaskData taskData)
  {
    return taskService.saveTaskData(taskData);
  }

  @DELETE
  @Path("/data/{dataId}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Delete task data")
  public ApiResult deleteTaskData(@PathParam("dataId") String dataId)
  {
    boolean deleted = taskService.deleteTaskData(dataId);
    return new ApiResult(200, deleted ? "Deleted" : "Not deleted");
  }
}
