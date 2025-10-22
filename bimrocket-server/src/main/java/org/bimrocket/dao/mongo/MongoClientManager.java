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

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.internal.connection.PowerOfTwoBufferPool;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.bimrocket.util.Cleaner;
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.codecs.pojo.PojoCodecProvider;

import static org.bson.codecs.configuration.CodecRegistries.*;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class MongoClientManager
{
  static final Logger LOGGER = Logger.getLogger(MongoClientManager.class.getName());

  Map<String, MongoClient> clientCache = new HashMap<>();

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init {0}", MongoClientManager.class.getName());
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "Destroying {0}", MongoClientManager.class.getName());

    clientCache.forEach((url, mongoClient) ->
    {
      try (mongoClient)
      {
        LOGGER.log(Level.INFO, "Closing client for {0}", url);
      }
    });

    Cleaner.shutdownExecutor(PowerOfTwoBufferPool.DEFAULT, "pruner");
  }

  public synchronized MongoClient getMongoClient(String url)
  {
    MongoClient mongoClient = clientCache.get(url);
    if (mongoClient == null)
    {
      ConnectionString connectionString = new ConnectionString(url);

      CodecRegistry pojoCodecRegistry = fromProviders(
        PojoCodecProvider.builder()
          .automatic(true)
          .build());

      CodecRegistry codecRegistry = fromRegistries(
        MongoClientSettings.getDefaultCodecRegistry(), pojoCodecRegistry, fromCodecs(new ObjectCodec()));

      MongoClientSettings clientSettings = MongoClientSettings.builder()
        .applyConnectionString(connectionString)
        .codecRegistry(codecRegistry)
        .build();
      mongoClient = MongoClients.create(clientSettings);
      clientCache.put(url, mongoClient);
    }
    return mongoClient;
  }
}
