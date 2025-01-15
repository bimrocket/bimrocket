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
package org.bimrocket.dao.orient;

import com.orientechnologies.orient.core.Orient;
import com.orientechnologies.orient.core.db.ODatabaseDocumentInternal;
import com.orientechnologies.orient.core.db.ODatabasePool;
import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import com.orientechnologies.orient.core.storage.cache.local.OWOWCache;
import com.orientechnologies.orient.core.storage.impl.local.OAbstractPaginatedStorage;
import com.orientechnologies.orient.core.storage.impl.local.paginated.wal.cas.CASDiskWriteAheadLog;
import com.orientechnologies.orient.object.db.OObjectDatabaseTx;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.lang.reflect.Field;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ExecutorService;
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

  static final String BASE = "databases.";

  @Inject
  Config config;

  Map<String, ODatabasePool> poolCache = new HashMap<>();

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

    poolCache.forEach((dbAlias, db) -> {
      LOGGER.log(Level.INFO, "Closing pool {0}", dbAlias);
      db.close();
    });

    poolCache.clear();

    Orient.instance().shutdown();

    shutdownExecutors();
  }

  public synchronized ODatabaseDocument getDocumentConnection(String dbAlias)
  {
    ODatabasePool pool = getPool(dbAlias);
    return pool.acquire();
  }

  public synchronized ODatabaseObject getObjectConnection(String dbAlias)
  {
    ODatabasePool pool = getPool(dbAlias);
    return new OObjectDatabaseTx((ODatabaseDocumentInternal) pool.acquire());
  }

  private ODatabasePool getPool(String dbAlias)
  {
    ODatabasePool pool = poolCache.get(dbAlias);
    if (pool == null)
    {
      pool = createPool(dbAlias);
      poolCache.put(dbAlias, pool);
    }
    return pool;
  }

  private synchronized ODatabasePool createPool(String dbAlias)
  {
    String url = config.getOptionalValue(BASE + dbAlias + ".url", String.class).orElse(null);
    if (url == null) throw new RuntimeException("Invalid dbAlias: " + dbAlias);

    String username =
      config.getOptionalValue(BASE + dbAlias + ".username", String.class).orElse(null);
    String password =
      config.getOptionalValue(BASE + dbAlias + ".password", String.class).orElse(null);

    createDatabaseIfNotExists(url, username, password);

    ODatabasePool pool = new ODatabasePool(url, username, password);

    return pool;
  }

  private void createDatabaseIfNotExists(String url,
    String username, String password)
  {
    int index = url.lastIndexOf("/");
    if (index == -1) throw new RuntimeException("Invalid database url: " + url);

    String serverUrl = url.substring(0, index);
    String dbName = url.substring(index + 1);

    try (OrientDB server = new OrientDB(serverUrl,
      username, password, OrientDBConfig.defaultConfig()))
    {
      if (!server.exists(dbName))
      {
        LOGGER.log(Level.INFO, "Creating database {0} in {1}",
          new Object[]{ dbName, serverUrl });

        server.execute(
          "create database ? plocal users (? identified by ? role admin) ",
          dbName, username, password);
      }
    }
  }

  private void shutdownExecutors()
  {
    shutdownExecutor(OWOWCache.class, "commitExecutor");
    shutdownExecutor(OAbstractPaginatedStorage.class, "fuzzyCheckpointExecutor");
    shutdownExecutor(CASDiskWriteAheadLog.class, "commitExecutor");
    shutdownExecutor(CASDiskWriteAheadLog.class, "writeExecutor");
  }

  private void shutdownExecutor(Class<?> cls, String fieldName)
  {
    try
    {
      LOGGER.log(Level.INFO, "Shutting down executor {0}",
        cls.getSimpleName() + "." + fieldName);
      Field field = cls.getDeclaredField(fieldName);
      field.setAccessible(true);
      ExecutorService executorService = (ExecutorService)field.get(null);
      executorService.shutdownNow();
    }
    catch (Exception ex)
    {
      // ignore
    }
  }
}
