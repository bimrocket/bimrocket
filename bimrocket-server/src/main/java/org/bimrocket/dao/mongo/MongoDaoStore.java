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
package org.bimrocket.dao.mongo;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import jakarta.inject.Inject;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.dao.DaoStore;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

/**
 *
 * @author realor
 * @param <C> the Dao connection
 */
public abstract class MongoDaoStore<C extends DaoConnection>
  implements DaoStore<C>
{
  static final String BASE = "databases.";

  private String dbAlias;
  private MongoClient mongoClient;
  private MongoDatabase database;

  @Inject
  MongoClientManager clientManager;

  public String getDbAlias()
  {
    return dbAlias;
  }

  public void setDbAlias(String dbAlias)
  {
    this.dbAlias = dbAlias;
  }

  public MongoClient getMongoClient()
  {
    if (mongoClient == null)
    {
      Config config = ConfigProvider.getConfig();

      String url = config.getOptionalValue(BASE + dbAlias + ".url",
        String.class).orElse(null);
      if (url == null)
        throw new RuntimeException("Missing server url for " + dbAlias);

      mongoClient = clientManager.getMongoClient(url);
    }
    return mongoClient;
  }

  public MongoDatabase getDatabase()
  {
    if (database == null)
    {
      Config config = ConfigProvider.getConfig();
      String dbName = config.getOptionalValue(BASE + dbAlias + ".name",
        String.class).orElse(null);
      if (dbName == null) dbName = dbAlias;

      database = getMongoClient().getDatabase(dbName);
    }
    return database;
  }

  @Override
  public void close()
  {
    // client is closed by MongoClientManager
    mongoClient = null;
    database = null;
  }
}
