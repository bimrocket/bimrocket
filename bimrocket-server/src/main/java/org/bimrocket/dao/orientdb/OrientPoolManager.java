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
package org.bimrocket.dao.orientdb;

import com.orientechnologies.orient.core.Orient;
import com.orientechnologies.orient.core.db.ODatabaseType;
import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import com.orientechnologies.orient.object.db.ODatabaseObjectPool;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.HashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class OrientPoolManager
{
  static final Logger LOGGER = Logger.getLogger("OrientPoolManager");

  @Inject
  Config config;

  Map<String, ODatabaseObjectPool> poolCache = new HashMap<>();

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init OrientPoolManager");
    Orient.instance().removeShutdownHook();
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "Destroying OrientPoolManager");

    poolCache.forEach((dbName, db) -> {
      LOGGER.log(Level.INFO, "Closing pool {0}", dbName);
      db.close();
    });

    poolCache.clear();

    Orient.instance().shutdown();
  }

  public synchronized ODatabaseObject getConnection(String dbName)
  {
    ODatabaseObjectPool pool = poolCache.get(dbName);
    if (pool == null)
    {
      pool = createPool(dbName);
      poolCache.put(dbName, pool);
    }
    return pool.acquire();
  }

  private ODatabaseObjectPool createPool(String name)
  {
    String base = "databases.";
    String url = config.getValue(base + name + ".url", String.class);
    String username =
      config.getOptionalValue(base + name + ".username", String.class).orElse(null);
    String password =
      config.getOptionalValue(base + name + ".password", String.class).orElse(null);

    OrientDBConfig orientConfig = OrientDBConfig.defaultConfig();

    if (url.startsWith("embedded:"))
    {
      int index = url.lastIndexOf("/");
      if (index != -1)
      {
        String path = url.substring(0, index + 1);
        String dbName = url.substring(index + 1);

        try (OrientDB orientDB = new OrientDB(path, orientConfig))
        {
          if (!orientDB.exists(dbName))
          {
            LOGGER.log(Level.INFO, "Creating embedded database {0} in {1}",
              new Object[]{dbName, path});
            orientDB.create(dbName, ODatabaseType.PLOCAL);
          }
        }
      }
    }

    ODatabaseObjectPool pool = new ODatabaseObjectPool(url,
      username, password, orientConfig);

    return pool;
  }
}
