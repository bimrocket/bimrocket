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
package org.bimrocket;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URL;
import java.util.List;
import java.util.Optional;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

/**
 *
 * @author realor
 */
@ApplicationPath("/api")
public class BimRocketApplication extends Application
{
  static final Logger LOGGER = Logger.getLogger("BimRocketApplication");

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "BimRocket INIT");

    String userHome = System.getProperty("user.home");
    int index = userHome.indexOf(":");
    if (index != -1) userHome = userHome.substring(index + 1);
    String userHomeSlash = userHome.replace('\\', '/');
    System.setProperty("user.home.slash", userHomeSlash);
    LOGGER.log(Level.INFO, "User home: {0}", userHomeSlash);

    createDefaultConfig();
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "BimRocket DESTROY");
  }

  private void createDefaultConfig()
  {
    Config config = ConfigProvider.getConfig();
    Optional<List<String>> locations =
      config.getOptionalValues("smallrye.config.locations", String.class);

    if (locations.isPresent())
    {
      File file = null;

      for (String location : locations.get())
      {
        try
        {
          URI uri = new URI(location);
          String scheme = uri.getScheme();
          if (scheme == null || "file".equals(scheme))
          {
            file = new File(uri.getPath());
            break;
          }
        }
        catch (Exception ex)
        {
          // ignore
        }
      }

      if (file != null)
      {
        if (file.exists())
        {
          LOGGER.log(Level.INFO, "Config found in {0}", file);
        }
        else
        {
          try
          {
            URL resource = getClass().getResource("/application.yaml");
            file.getParentFile().mkdirs();
            try (InputStream is = resource.openStream();
                 OutputStream os = new FileOutputStream(file))
            {
              IOUtils.copy(is, os);
            }
            LOGGER.log(Level.INFO, "Config created in {0}", file);
          }
          catch (Exception ex)
          {
            LOGGER.log(Level.WARNING, "Can not create config in {0}: {1}",
              new Object[]{ file, ex });
          }
        }
      }
    }
  }
}
