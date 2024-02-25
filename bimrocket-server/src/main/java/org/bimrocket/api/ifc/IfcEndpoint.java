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
package org.bimrocket.api.ifc;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.inject.Inject;
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
import org.bimrocket.service.ifc.IfcService;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import static jakarta.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;

/**
 *
 * @author realor
 */
@Path("ifc/1.0")
@Tag(name="IFC", description="Industry Foundation Classes")
public class IfcEndpoint
{
  @Inject
  IfcService ifcService;

  /* Auth */

  @GET
  @Path("/auth")
  @Produces(APPLICATION_JSON)
  public List<String> getAuth()
  {
    return new ArrayList<>();
  }

  @GET
  @Path("/files/{schema}/{fileId}")
  public Response getIfcFileById(@PathParam("schema") String schemaName,
    @PathParam("fileId") String fileId)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");

      ifcService.getIfcFileById(schemaName, fileId, ifcFile);

      return sendIfcFile(ifcFile);
    }
    catch (Exception ex)
    {
      return Response.status(INTERNAL_SERVER_ERROR).build();
    }
  }

  @POST
  @Path("/files/{schema}")
  public Response getIfcFileByQuery(@PathParam("schema") String schemaName,
    IfcQuery query)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");

      ifcService.getIfcFileByQuery(schemaName, query.getQuery(), ifcFile);

      return sendIfcFile(ifcFile);
    }
    catch (Exception ex)
    {
      return Response.status(INTERNAL_SERVER_ERROR).build();
    }
  }

  @PUT
  @Path("/files/{schema}/{fileId}")
  public Response putIfcFile(@PathParam("schema") String schemaName,
    @PathParam("fileId") String fileId, InputStream input)
  {
    try
    {
      File ifcFile = File.createTempFile("file", ".ifc");
      try (FileOutputStream output = new FileOutputStream(ifcFile))
      {
        IOUtils.copy(input, output);
      }

      ifcService.putIfcFile(schemaName, fileId, ifcFile);

      return Response.ok().build();
    }
    catch (Exception ex)
    {
      return Response.status(INTERNAL_SERVER_ERROR).build();
    }
  }

  private Response sendIfcFile(File ifcFile)
  {
    StreamingOutput stream = (OutputStream output) ->
    {
      try (FileInputStream input = new FileInputStream(ifcFile))
      {
        IOUtils.copy(input, output);
      }
    };
    ResponseBuilder builder = Response.ok(stream);

    return builder.header("Content-Type", "application/x-step")
      .header("Content-Length", ifcFile.length())
      .lastModified(new Date())
      .build();
  }

}
