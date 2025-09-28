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

import com.mongodb.client.ClientSession;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.result.DeleteResult;
import static com.mongodb.connection.ClusterType.REPLICA_SET;
import jakarta.enterprise.inject.spi.CDI;
import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.stream.Collectors;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.mongo.MongoExpressionGenerator;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.express.ExpressSchema;
import static org.bimrocket.service.ifcdb.IfcdbService.MODEL_NOT_FOUND;
import org.bimrocket.service.ifcdb.store.IfcData;
import org.bimrocket.service.ifcdb.store.IfcdbConnection;
import static org.bimrocket.service.ifcdb.store.mongo.MongoIfcStore.LOGGER;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.Chronometer;
import org.bson.BsonArray;
import org.bson.Document;
import org.bson.conversions.Bson;

/**
 *
 * @author realor
 */
public class MongoIfcConnection implements IfcdbConnection
{
  static final String MODEL_COL = "IfcdbModel";
  static final String VERSION_COL = "IfcdbVersion";
  static final String OBJECT_COL = "IfcdbObject";

  protected final ClientSession session;
  protected final boolean transactionEnabled;
  protected final MongoDatabase db;
  protected final ExpressSchema schema;

  public MongoIfcConnection(MongoClient mongoClient, MongoDatabase db,
    ExpressSchema schema)
  {
    this.session = mongoClient.startSession();
    this.transactionEnabled = mongoClient.getClusterDescription()
      .getType().equals(REPLICA_SET);
    this.db = db;
    this.schema = schema;
  }

  @Override
  public ExpressSchema getSchema()
  {
    return schema;
  }

  @Override
  public void createSchema()
  {
    IndexOptions options = new IndexOptions().unique(false);

    db.getCollection(OBJECT_COL)
      .createIndex(Indexes.ascending("_modelId", "_version"), options);
    db.getCollection(OBJECT_COL)
      .createIndex(Indexes.ascending("_class"), options);
    db.getCollection(OBJECT_COL)
      .createIndex(Indexes.ascending("GlobalId"), options);
  }

  @Override
  public List<IfcdbModel> findModels(Expression filter,
    List<OrderByExpression> orderByList, Set<String> roles)
  {
    Set<String> userRoleIds = getCurrentUserRoleIds();

    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    MongoCursor<IfcdbModel> cursor;

    MongoExpressionGenerator generator = new MongoExpressionGenerator();
    List<Document> aggregate = generator.generateAggregate(filter, orderByList);

    if (!userRoleIds.contains(ADMIN_ROLE))
    {
      // add filter by roles
      aggregate.add(
        new Document("$match",
          new Document("$expr",
            new Document("$gt",
              List.of(
                new Document("$size",
                  new Document("$setIntersection",
                    List.of(
                      new Document("$getField", "readRoleIds"),
                      new Document("$literal", userRoleIds)))),
                0)))));
    }
    cursor = modelCol.aggregate(aggregate).cursor();

    List<IfcdbModel> ifcdbModels = new ArrayList<>();
    while (cursor.hasNext())
    {
      ifcdbModels.add(cursor.next());
    }
    return ifcdbModels;
  }

  @Override
  public List<IfcdbVersion> getModelVersions(String modelId)
  {
    MongoCollection<Document> versionCol = db.getCollection(VERSION_COL);
    MongoCursor<Document> cursor = versionCol.find(eq("modelId", modelId))
      .cursor();

    List<IfcdbVersion> versions = new ArrayList<>();
    while (cursor.hasNext())
    {
      Document document = cursor.next();
      IfcdbVersion ifcdbVersion = new IfcdbVersion();
      ifcdbVersion.setVersion(document.getInteger("version"));
      ifcdbVersion.setCreationAuthor(document.getString("creationAuthor"));
      ifcdbVersion.setCreationDate(document.getString("creationDate"));
      ifcdbVersion.setElementCount(document.getInteger("elementCount"));
      versions.add(ifcdbVersion);
    }
    return versions;
  }

  @Override
  public IfcdbModel createModel(IfcdbModel model)
  {
    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    model.setLastVersion(0);
    modelCol.insertOne(model);

    return model;
  }

  @Override
  public IfcdbVersion createModelVersion(String modelId, IfcdbVersion ifcdbVersion)
  {
    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    IfcdbModel ifcdbModel = modelCol.find(eq("_id", modelId)).first();
    if (ifcdbModel == null) throw new NotFoundException(MODEL_NOT_FOUND);

    ifcdbVersion.setVersion(ifcdbModel.getLastVersion() + 1);

    ifcdbModel.setLastVersion(ifcdbVersion.getVersion());
    modelCol.findOneAndReplace(eq("_id", modelId), ifcdbModel);

    MongoCollection<Document> versionCol = db.getCollection(VERSION_COL);

    Document version = new Document();
    version.put("modelId", modelId);
    version.put("version", ifcdbVersion.getVersion());
    version.put("creationDate", ifcdbVersion.getCreationDate());
    version.put("creationAuthor", ifcdbVersion.getCreationAuthor());
    version.put("elementCount", 0);
    versionCol.insertOne(version);

    return ifcdbVersion;
  }

  @Override
  public IfcdbModel getModel(String modelId)
  {
    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    return modelCol.find(eq("_id", modelId)).first();
  }

  @Override
  public IfcdbModel updateModel(IfcdbModel model)
  {
    String modelId = model.getId();

    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    IfcdbModel prevModel = modelCol.find(eq("_id", modelId)).first();
    if (prevModel == null)
      throw new NotFoundException(MODEL_NOT_FOUND);

    // preserve actual last version
    model.setLastVersion(prevModel.getLastVersion());

    // replace model
    model = modelCol.findOneAndReplace(eq("_id", modelId), model);

    return model;
  }

  @Override
  public boolean deleteModel(String modelId, int version)
  {
    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);
    IfcdbModel model = modelCol.find(eq("_id", modelId)).first();
    if (model == null)
      throw new NotFoundException(MODEL_NOT_FOUND);

    MongoCollection<IfcdbVersion> versionCol =
      db.getCollection(VERSION_COL, IfcdbVersion.class);

    MongoCollection<Document> objectCol = db.getCollection(OBJECT_COL);

    DeleteResult deleteResult;

    if (version == 0) // remove all versions
    {
      objectCol.deleteMany(eq("_modelId", modelId));
      versionCol.deleteMany(eq("modelId", modelId));
      deleteResult = modelCol.deleteOne(eq("_id", modelId));
    }
    else // remove specific version
    {
      objectCol.deleteMany(and(eq("_modelId", modelId), eq("_version", version)));

      deleteResult =
        versionCol.deleteOne(and(eq("modelId", modelId), eq("version", version)));

      if (version == model.getLastVersion())
      {
        IfcdbVersion lastVersion = versionCol.find(eq("modelId", modelId))
          .sort(Sorts.descending("version"))
          .limit(1)
          .first();
        if (lastVersion == null)
        {
          modelCol.deleteOne(eq("_id", modelId));
        }
        else
        {
          model.setLastVersion(lastVersion.getVersion());
          modelCol.replaceOne(eq("_id", modelId), model);
        }
      }
    }
    return deleteResult.getDeletedCount() > 0;
  }

  @Override
  public IfcData createData()
  {
    return new MongoIfcData(schema, db.getCollection(OBJECT_COL));
  }

  @Override
  public IfcData loadData(String modelId, int version)
  {
    var chrono = new Chronometer();

    MongoCollection<Document> objectCol = db.getCollection(OBJECT_COL);

    MongoIfcData data = new MongoIfcData(schema, objectCol);

    MongoCursor<Document> cursor = objectCol.find(
      and(eq("_modelId", modelId), eq("_version", version))).cursor();

    cursor.forEachRemaining(object -> data.getElements().add(object));

    data.updateCache();

    LOGGER.log(Level.INFO, "Query execution: {0} seconds", chrono.seconds());
    chrono.mark();

    return data;
  }

  @Override
  public void saveData(String modelId, int version, IfcData data)
  {
    var chrono = new Chronometer();

    MongoIfcData mongoData = (MongoIfcData)data;

    for (Document element : mongoData.getElements())
    {
      element.put("_modelId", modelId);
      element.put("_version", version);
    }

    MongoCollection<Document> ifcObjects = db.getCollection(OBJECT_COL);
    ifcObjects.insertMany(mongoData.getElements());

    MongoCollection<Document> versionCol = db.getCollection(VERSION_COL);
    Bson filter = and(eq("modelId", modelId), eq("version", version));
    Document ifcdbVersion = versionCol.find(filter).first();
    if (ifcdbVersion == null) throw new NotFoundException("Invalid version");
    ifcdbVersion.put("elementCount", mongoData.getElements().size());
    versionCol.replaceOne(filter, ifcdbVersion);

    LOGGER.log(Level.INFO, "Model loaded in {0} seconds", chrono.totalSeconds());
  }

  @Override
  public IfcData queryData(String query, String language)
  {
    var chrono = new Chronometer();

    BsonArray bsonArray = BsonArray.parse(query);

    MongoCollection<Document> objectCol = db.getCollection(OBJECT_COL);

    MongoIfcData data = new MongoIfcData(schema, objectCol);

    List<Bson> aggregate = bsonArray.stream()
      .map(bson -> bson.asDocument())
      .collect(Collectors.toList());

    MongoCursor<Document> cursor = objectCol.aggregate(aggregate).cursor();

    LOGGER.log(Level.INFO, "Query execution: {0} seconds", chrono.seconds());
    chrono.mark();

    cursor.forEachRemaining(document -> data.getElements().add(document));

    LOGGER.log(Level.INFO,"Total time: {0} seconds", chrono.totalSeconds());

    return data;
  }

  @Override
  public void execute(String query, String language, File outputFile)
    throws IOException
  {
    var chrono = new Chronometer();

    BsonArray bsonArray = BsonArray.parse(query);

    List<Bson> aggregate = bsonArray.stream()
      .map(bson -> bson.asDocument())
      .collect(Collectors.toList());

    MongoCursor<Document> cursor =
      db.getCollection(OBJECT_COL).aggregate(aggregate).cursor();

    List<Document> results = new ArrayList<>();
    cursor.forEachRemaining(document -> results.add(document));

    LOGGER.log(Level.INFO, "Query execution: {0} seconds", chrono.seconds());
    chrono.mark();

    exportToJson(results, outputFile);

    LOGGER.log(Level.INFO, "Data export: {0} seconds", chrono.seconds());
    LOGGER.log(Level.INFO,"Total time: {0} seconds", chrono.totalSeconds());
  }

  @Override
  public void begin()
  {
    // TODO: session.startTransaction();
  }

  @Override
  public void commit()
  {
    if (session.hasActiveTransaction())
    {
      session.commitTransaction();
    }
  }

  @Override
  public void rollback()
  {
    if (session.hasActiveTransaction())
    {
      session.abortTransaction();
    }
  }

  @Override
  public void close()
  {
    session.close();
  }

  private Set<String> getCurrentUserRoleIds()
  {
    SecurityService securityService =
      CDI.current().select(SecurityService.class).get();

    return securityService.getCurrentUser().getRoleIds();
  }

  private void exportToJson(List<Document> results, File file)
    throws IOException
  {
    try (PrintWriter writer = new PrintWriter(file, "UTF-8"))
    {
      writer.print("[");
      for (int i = 0; i < results.size(); i++)
      {
        Document document = results.get(i);
        if (i > 0) writer.println(",");
        writer.print(document.toJson());
      }
      writer.print("]");
    }
  }
}
