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
package org.bimrocket.config;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.config.spi.ConfigSource;

/**
 *
 * @author realor
 */
public class BaseConfigSource implements ConfigSource
{
  static final Logger LOGGER = Logger.getLogger("BaseConfigSource");

  public static final String BIMROCKET_LOCATION = "bimrocket.location";
  public static final String BIMROCKET_FOLDER = "bimrocket";
  public static final String BIMROCKET_YAML = "bimrocket-server.yaml";
  public static final String CONFIG_LOCATION = "smallrye.config.locations";

  private static final Map<String, String> configuration = new HashMap<>();

  static
  {
    String bimRocketLocation = getBimRocketLocation();
    String configLocation = bimRocketLocation + "/" + BIMROCKET_YAML;

    createDefaultConfig(configLocation);

    configuration.put(BIMROCKET_LOCATION, bimRocketLocation);
    configuration.put(CONFIG_LOCATION, configLocation);
  }

  @Override
  public int getOrdinal()
  {
    return 350;
  }

  @Override
  public Set<String> getPropertyNames()
  {
    return configuration.keySet();
  }

  @Override
  public String getValue(final String propertyName)
  {
    return configuration.get(propertyName);
  }

  @Override
  public String getName()
  {
    return BaseConfigSource.class.getSimpleName();
  }

  static String getBimRocketLocation()
  {
    String location = System.getProperty(BIMROCKET_LOCATION);
    if (location != null) return location;

    location = System.getenv(BIMROCKET_LOCATION);
    if (location != null) return location;

    String userHome = System.getProperty("user.home");
    int index = userHome.indexOf(":");
    if (index != -1) userHome = userHome.substring(index + 1);
    String userHomeSlash = userHome.replace('\\', '/');

    return userHomeSlash + "/" + BIMROCKET_FOLDER;
  }

  static void createDefaultConfig(String configPath)
  {
    File file = new File(configPath);

    if (file.exists())
    {
      LOGGER.log(Level.INFO, "Config found in {0}", file);
    }
    else
    {
      try
      {
        URL resource = BaseConfigSource.class.getResource("/application.yaml");
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
