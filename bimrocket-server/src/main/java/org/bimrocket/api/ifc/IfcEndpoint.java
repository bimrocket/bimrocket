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
import jakarta.servlet.ServletContext;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import static jakarta.ws.rs.core.MediaType.APPLICATION_JSON;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author realor
 */
@Path("ifc/1.0")
@Tag(name="IFC", description="Industry Foundation Classes")
public class IfcEndpoint
{
  @Context
  ServletContext context;
        
  @HeaderParam("Authorization") 
  String autho;

  /* Auth */
  
  @GET
  @Path("/auth")
  @Produces(APPLICATION_JSON)
  public List<String> getAuth()
  {
    return new ArrayList<>();
  }

  @GET
  @Path("/projects/{projectId}")  
  public IfcProject getProject(@PathParam("projectId") String projectId)
  {
    IfcProject project = new IfcProject();
    project.setName("Test project");
    
    return project;
  }
}  
