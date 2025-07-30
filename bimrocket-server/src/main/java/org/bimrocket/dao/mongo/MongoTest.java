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
import com.mongodb.client.ClientSession;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import java.util.UUID;
import org.bimrocket.api.bcf.BcfTopic;
import static org.bson.codecs.configuration.CodecRegistries.fromProviders;
import static org.bson.codecs.configuration.CodecRegistries.fromRegistries;
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.codecs.pojo.PojoCodecProvider;

/**
 *
 * @author realor
 */
public class MongoTest
{
  public static void main(String[] args)
  {
    String uri = "mongodb://localhost";
    ConnectionString connectionString = new ConnectionString(uri);
    CodecRegistry pojoCodecRegistry = fromProviders(PojoCodecProvider.builder().automatic(true).build());
    CodecRegistry codecRegistry = fromRegistries(MongoClientSettings.getDefaultCodecRegistry(), pojoCodecRegistry);
    MongoClientSettings clientSettings = MongoClientSettings.builder()
      .applyConnectionString(connectionString)
      .codecRegistry(codecRegistry)
      .build();

    try (MongoClient mongoClient = MongoClients.create(clientSettings))
    {
      try (ClientSession session = mongoClient.startSession())
      {
//        TransactionOptions txnOptions = TransactionOptions.builder()
//          .writeConcern(WriteConcern.MAJORITY)
//          .build();
//        session.startTransaction(txnOptions);

        //session.startTransaction();

        MongoDatabase database = mongoClient.getDatabase("sample");

//        MongoCollection<Document> topics = database.getCollection("BcfTopic");
//        Document topic = new Document();
//        topic.append("uuid", UUID.randomUUID().toString());
//        topic.append("title", "Finestra trencada");
//        topic.append("index", 3);
//        topic.append("completed", false);
//        topics.insertOne(topic);
//
//        Document topic2 = new Document();
//        topic2.append("uuid", UUID.randomUUID().toString());
//        topic2.append("title", "Porta trencada");
//        topic2.append("index", 4);
//        topic2.append("completed", false);
//        topics.insertOne(topic2);
        MongoCollection<BcfTopic> topics = database.getCollection("BcfTopic", BcfTopic.class);
        BcfTopic topic = new BcfTopic();
        topic.setId(UUID.randomUUID().toString());
        topic.setTitle("Finestra trencada");
        topic.setIndex(1);
        topic.setCreationAuthor("realor");
        topic.setTopicStatus("Open");
        topics.insertOne(session, topic);

        System.out.println(topic.getId());

        //session.commitTransaction();
      }
    }
  }

}
