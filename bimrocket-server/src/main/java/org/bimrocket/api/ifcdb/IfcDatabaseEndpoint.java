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
package org.bimrocket.api.ifcdb;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.ResponseBuilder;
import jakarta.ws.rs.core.StreamingOutput;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Date;
import java.util.List;
import org.apache.commons.io.IOUtils;
import org.bimrocket.service.ifcdb.IfcdbService;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.TEXT_PLAIN;
import org.bimrocket.api.ApiResult;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.expression.io.odata.ODataParser;
import static org.bimrocket.service.ifcdb.IfcdbService.modelFieldMap;

/**
 *
 * @author realor
 */
@Path("ifcdb/1.0")
@Tag(name="IFCDB", description="Industry Foundation Classes Database")
public class IfcDatabaseEndpoint
{
  @Inject
  IfcdbService ifcDatabaseService;

  /* Auth */

  @GET
  @Path("/auth")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get authorization schemes")
  public List<String> getAuth()
  {
    return List.of("Basic");
  }

  @GET
  @Path("/models/{schema}")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Find models")
  public List<IfcdbModel> getModels(@PathParam("schema") String schemaName,
    @QueryParam("$filter") String odataFilter,
    @QueryParam("$orderBy") String odataOrderBy)
  {
    ODataParser parser = new ODataParser(modelFieldMap);
    Expression filter = parser.parseFilter(odataFilter);
    List<OrderByExpression> orderByList = parser.parseOrderBy(odataOrderBy);

    return ifcDatabaseService.getModels(schemaName, filter, orderByList);
  }

  @GET
  @Path("/models/{schema}/{modelId}/versions")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Get IFC model versions")
  public List<IfcdbVersion> getModelVersions(
    @PathParam("schema") String schemaName,
    @PathParam("modelId") String modelId)
  {
    try
    {
      return ifcDatabaseService.getModelVersions(schemaName, modelId);
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @GET
  @Path("/models/{schema}/{modelId}")
  @Produces({ APPLICATION_JSON, TEXT_PLAIN })
  @Operation(summary = "Download IFC model")
  public Response downloadModel(@PathParam("schema") String schemaName,
    @PathParam("modelId") String modelId, @QueryParam("version") int version)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");

      ifcDatabaseService.downloadModel(schemaName, modelId, version, ifcFile);

      return sendFile(ifcFile, "application/x-step");
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @POST
  @Path("/models/{schema}")
  @Produces(APPLICATION_JSON)
  @Operation(summary = "Upload IFC model")
  public IfcdbModel uploadModel(@PathParam("schema") String schemaName,
    InputStream input)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");
      try (FileOutputStream output = new FileOutputStream(ifcFile))
      {
        IOUtils.copy(input, output);
      }

      return ifcDatabaseService.uploadModel(schemaName, ifcFile);
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @PUT
  @Path("/models/{schema}")
  @Consumes(APPLICATION_JSON)
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Update model metadata")
  public IfcdbModel updateModel(@PathParam("schema") String schemaName, IfcdbModel model)
  {
    return ifcDatabaseService.updateModel(schemaName, model);
  }

  @DELETE
  @Path("/models/{schema}/{modelId}")
  @Produces(APPLICATION_JSON)
  @RolesAllowed("ADMIN")
  @Operation(summary = "Delete model")
  public ApiResult deleteModel(@PathParam("schema") String schemaName,
    @PathParam("modelId") String modelId, @QueryParam("version") int version)
  {
    try
    {
      boolean deleted = ifcDatabaseService.deleteModel(schemaName, modelId, version);
      return new ApiResult(200, deleted ? "Deleted." : "Not deleted.");
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @POST
  @Path("/models/{schema}/execute")
  @Consumes(APPLICATION_JSON)
  @Produces({ APPLICATION_JSON, TEXT_PLAIN })
  @RolesAllowed("ADMIN")
  @Operation(summary = "Execute command")
  public Response execute(@PathParam("schema") String schemaName,
    IfcdbCommand command)
  {
    try
    {
      if ("json".equals(command.getOutputFormat()))
      {
        File file = File.createTempFile("file", ".json");

        ifcDatabaseService.execute(schemaName, command, file);

        return sendFile(file, "application/json");
      }
      else
      {
        File file = File.createTempFile("file", ".ifc");

        ifcDatabaseService.execute(schemaName, command, file);

        return sendFile(file, "application/x-step");
      }
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  // internal methods

  private Response sendFile(File file, String contentType)
  {
    StreamingOutput stream = (OutputStream output) ->
    {
      try (FileInputStream input = new FileInputStream(file))
      {
        IOUtils.copy(input, output);
      }
    };
    ResponseBuilder builder = Response.ok(stream);

    return builder.header("Content-Type", contentType)
      .header("Content-Length", file.length())
      .lastModified(new Date())
      .build();
  }

  private RuntimeException createException(Exception ex)
  {
    String message = ex.getMessage();
    if (message == null) message = ex.toString();

    return new RuntimeException(message);
  }
}
