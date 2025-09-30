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

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.eclipse.microprofile.config.spi.ConfigSource;

/**
 *
 * @author realor
 */
public class EnvConfigSource implements ConfigSource
{
  public static final String PREFIX = "bimrocket_";

  private static final Map<String, String> configuration = new HashMap<>();

  static
  {
    Map<String, String> envMap = System.getenv();
    for (Map.Entry<String, String> entry : envMap.entrySet())
    {
      String key = entry.getKey();
      if (key.startsWith(PREFIX))
      {
        String normKey = key.substring(PREFIX.length()).replace("_", ".");
        configuration.put(normKey, entry.getValue());
      }
    }
  }

  @Override
  public int getOrdinal()
  {
    return 400;
  }

  @Override
  public Map<String, String> getProperties()
  {
    return configuration;
  }

  @Override
  public Set<String> getPropertyNames()
  {
    return configuration.keySet();
  }

  @Override
  public String getValue(String propertyName)
  {
    return configuration.get(propertyName);
  }

  @Override
  public String getName()
  {
    return EnvConfigSource.class.getSimpleName();
  }
}
