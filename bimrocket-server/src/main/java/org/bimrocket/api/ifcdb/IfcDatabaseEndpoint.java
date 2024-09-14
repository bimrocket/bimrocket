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
package org.bimrocket.api.ifcdb;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.Response.ResponseBuilder;
import jakarta.ws.rs.core.StreamingOutput;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.io.IOUtils;
import org.bimrocket.service.ifcdb.IfcDatabaseService;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.MediaType.TEXT_PLAIN;

/**
 *
 * @author realor
 */
@Path("ifcdb/1.0")
@Tag(name="IFCDB", description="Industry Foundation Classes Database")
public class IfcDatabaseEndpoint
{
  @Inject
  IfcDatabaseService ifcDatabaseService;

  /* Auth */

  @GET
  @Path("/auth")
  @Produces(APPLICATION_JSON)
  public List<String> getAuth()
  {
    return new ArrayList<>();
  }

  @POST
  @Path("/models/{schema}")
  @Consumes(APPLICATION_JSON)
  @Produces({ TEXT_PLAIN, APPLICATION_JSON })
  public Response executeQuery(@PathParam("schema") String schemaName,
    IfcQuery query)
  {
    try
    {
      if ("json".equals(query.getOutputFormat()))
      {
        File file = File.createTempFile("file", ".json");

        ifcDatabaseService.executeQuery(schemaName, query, file);

        return sendFile(file, "application/json");
      }
      else
      {
        File file = File.createTempFile("file", ".ifc");

        ifcDatabaseService.executeQuery(schemaName, query, file);

        return sendFile(file, "application/x-step");
      }
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @GET
  @Path("/models/{schema}/{modelId}")
  @Produces({ TEXT_PLAIN, APPLICATION_JSON })
  public Response getModel(@PathParam("schema") String schemaName,
    @PathParam("modelId") String modelId)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");

      ifcDatabaseService.getModel(schemaName, modelId, ifcFile);

      return sendFile(ifcFile, "application/x-step");
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @PUT
  @Path("/models/{schema}/{modelId}")
  @Produces(APPLICATION_JSON)
  public IfcUploadResult putModel(@PathParam("schema") String schemaName,
    @PathParam("modelId") String modelId, InputStream input)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");
      try (FileOutputStream output = new FileOutputStream(ifcFile))
      {
        IOUtils.copy(input, output);
      }

      return ifcDatabaseService.putModel(schemaName, modelId, ifcFile);
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

  @DELETE
  @Path("/models/{schema}/{modelId}")
  @Produces(APPLICATION_JSON)
  public IfcDeleteResult deleteModel(@PathParam("schema") String schemaName,
    @PathParam("modelId") String modelId)
  {
    try
    {
      return ifcDatabaseService.deleteModel(schemaName, modelId);
    }
    catch (Exception ex)
    {
      throw createException(ex);
    }
  }

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
