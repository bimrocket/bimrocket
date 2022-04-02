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
package org.bimrocket.api.print;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.servlet.ServletContext;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import java.io.InputStream;
import java.io.OutputStream;
import org.bimrocket.service.print.PrintService;
import static jakarta.ws.rs.core.MediaType.TEXT_PLAIN;
import static jakarta.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;
import java.io.IOException;

/**
 *
 * @author realor
 */
@Path("print")
@Tag(name="Print", description="PDF print service")
public class PrintEndpoint
{
  @Context
  ServletContext servletContext;

  @Inject
  PrintService printService;

  @POST
  @Path("/{filename}")
  @PermitAll
  @Consumes(TEXT_PLAIN)
  public Response print(@PathParam("filename") String filename,
    InputStream input)
  {
    try
    {
      printService.print(filename, input);
      return Response.ok().build();
    }
    catch (IOException ex)
    {
      return Response.status(INTERNAL_SERVER_ERROR).build();
    }
  }

  @GET
  @Path("/{filename}")
  @PermitAll
  @Produces("application/pdf")
  public Response print(@PathParam("filename") String filename)
  {
    StreamingOutput output = (OutputStream out) ->
    {
      printService.copy(filename, out);
    };
    return Response.ok(output).build();
  }
}
