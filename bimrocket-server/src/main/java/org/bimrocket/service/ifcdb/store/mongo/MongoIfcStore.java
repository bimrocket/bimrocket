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
package org.bimrocket.service.ifcdb.store.mongo;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoDatabase;
import jakarta.inject.Inject;
import java.util.List;
import java.util.logging.Logger;
import org.bimrocket.dao.mongo.MongoClientManager;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.service.ifcdb.store.IfcdbConnection;
import org.eclipse.microprofile.config.Config;
import org.bimrocket.service.ifcdb.store.IfcdbStore;

/**
 *
 * @author realor
 */
public class MongoIfcStore implements IfcdbStore
{
  static final String BASE = "databases.";

  static final Logger LOGGER =
    Logger.getLogger(MongoIfcStore.class.getName());

  static final List<String> supportedQueryLanguages = List.of("MongoQL");

  @Inject
  MongoClientManager clientManager;

  @Inject
  Config config;

  @Override
  public List<String> getSupportedQueryLanguages()
  {
    return supportedQueryLanguages;
  }

  @Override
  public IfcdbConnection getConnection(ExpressSchema schema)
  {
    String dbAlias = schema.getName();
    MongoClient mongoClient = getMongoClient(dbAlias);
    MongoDatabase db = mongoClient.getDatabase(dbAlias);

    return new MongoIfcConnection(mongoClient, db, schema);
  }

  @Override
  public IfcdbConnection getConnection()
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public void close()
  {
  }

  public MongoClient getMongoClient(String dbAlias)
  {
    String url = config.getOptionalValue(BASE + dbAlias + ".url",
      String.class).orElse(null);
    if (url == null)
      throw new RuntimeException("Missing server url for " + dbAlias);

    return clientManager.getMongoClient(url);
  }
}
