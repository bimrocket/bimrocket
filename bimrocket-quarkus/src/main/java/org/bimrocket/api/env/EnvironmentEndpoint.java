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
package org.bimrocket.api.env;

import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/**
 *
 * @author realor
 */
@Path("env")
@RequestScoped
@Tag(name="Environment", description="Frontend environment")
public class EnvironmentEndpoint
{
  static final String ENV_PATH = "frontend.env.path";

  @Inject
  Config config;

  @GET
  @Path("/Environment.js")
  @Produces("application/javascript")
  @PermitAll
  @Operation(summary = "Get JS environment")
  public String getEnvironment() throws IOException
  {
    File file = config.getOptionalValue(ENV_PATH, File.class).orElse(null);
    if (file != null && file.exists())
    {
      try (InputStream fis = new FileInputStream(file))
      {
        return IOUtils.toString(fis, "UTF-8");
      }
    }

    return """
      export const Environment =
      {
        SERVER_URL : "",
        MODULES : ["base", "design", "analysis", "bim", "gis", "control"]
      };
      """;
  }
}
