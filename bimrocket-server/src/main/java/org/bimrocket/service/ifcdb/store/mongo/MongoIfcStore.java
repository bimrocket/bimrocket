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
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.result.DeleteResult;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.bimrocket.api.ifcdb.IfcdbCommand;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.mongo.MongoClientManager;
import org.bimrocket.dao.mongo.MongoExpressionGenerator;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.express.ExpressSchema;
import static org.bimrocket.service.ifcdb.IfcDatabaseService.INSUFFICIENT_PRIVILEGES;
import static org.bimrocket.service.ifcdb.IfcDatabaseService.INVALID_IFC;
import static org.bimrocket.service.ifcdb.IfcDatabaseService.MODEL_NOT_FOUND;
import org.bimrocket.service.ifcdb.store.IfcStore;
import org.bimrocket.service.ifcdb.store.mongo.MongoStepLoader.MongoElements;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.Chronometer;
import static org.bimrocket.util.TextUtils.getISODate;
import org.bson.BsonArray;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
public class MongoIfcStore implements IfcStore
{
  static final Logger LOGGER =
    Logger.getLogger(MongoIfcStore.class.getName());

  static final String MODEL_COL = "IfcdbModel";
  static final String VERSION_COL = "IfcdbVersion";
  static final String OBJECT_COL = "IfcdbObject";

  static final List<String> supportedQueryLanguages = List.of("MongoQL");

  @Inject
  MongoClientManager clientManager;

  @Inject
  Config config;

  @Override
  public void createSchema(ExpressSchema schema) throws IOException
  {
    IndexOptions options = new IndexOptions().unique(false);

    MongoDatabase db = getDatabase(schema);
    db.getCollection(OBJECT_COL)
      .createIndex(Indexes.ascending("_modelId", "_version"), options);
    db.getCollection(OBJECT_COL)
      .createIndex(Indexes.ascending("_class"), options);
    db.getCollection(OBJECT_COL)
      .createIndex(Indexes.ascending("GlobalId"), options);
  }

  @Override
  public List<String> getSupportedQueryLanguages()
  {
    return supportedQueryLanguages;
  }

  @Override
  @SuppressWarnings("unchecked")
  public List<IfcdbModel> getModels(ExpressSchema schema, Expression filter,
    List<OrderByExpression> orderByList, Set<String> roleIds)
  {
    MongoDatabase db = getDatabase(schema);

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
  public List<IfcdbVersion> getModelVersions(ExpressSchema schema, String modelId)
  {
    MongoDatabase db = getDatabase(schema);

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
  public void downloadModel(ExpressSchema schema, String modelId, int version,
    File ifcFile) throws IOException
  {
    var chrono = new Chronometer();

    MongoDatabase db  = getDatabase(schema);

    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);
    IfcdbModel model = modelCol.find(eq("_id", modelId)).first();
    if (model == null)
      throw new NotFoundException(MODEL_NOT_FOUND);

    if (version == 0)
    {
      version = model.getLastVersion();
    }

    MongoCollection<Document> objectsCol = db.getCollection(OBJECT_COL);
    MongoCursor<Document> cursor = objectsCol.find(
      and(eq("_modelId", modelId), eq("_version", version))).cursor();

    List<Document> objects = new ArrayList<>();
    cursor.forEachRemaining(object -> objects.add(object));

    LOGGER.log(Level.INFO, "Query execution: {0} seconds", chrono.seconds());
    chrono.mark();

    MongoStepExporter exporter = new MongoStepExporter(schema, objectsCol);
    exporter.cacheDocuments(objects);
    exporter.export(new OutputStreamWriter(
      new FileOutputStream(ifcFile)), objects);

    LOGGER.log(Level.INFO,"IFC export: {0} seconds", chrono.seconds());
    LOGGER.log(Level.INFO, "Total time: {0} seconds", chrono.totalSeconds());
  }

  @Override
  public IfcdbModel uploadModel(ExpressSchema schema, File ifcFile)
    throws IOException
  {
    LOGGER.log(Level.INFO, "Model size: {0}", ifcFile.length());

    var chrono = new Chronometer();

    MongoDatabase db  = getDatabase(schema);

    MongoStepLoader loader = new MongoStepLoader(schema);
    MongoElements mongoElements = loader.load(ifcFile);

    Document project = mongoElements.getProject();
    if (project == null) throw new IOException(INVALID_IFC);
    String modelId = project.getString("GlobalId");
    if (modelId == null) throw new IOException(INVALID_IFC);

    Set<String> userRoleIds = getCurrentUserRoleIds();

    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    int lastVersion;

    IfcdbModel ifcdbModel = modelCol.find(eq("_id", modelId)).first();
    if (ifcdbModel == null) // new model
    {
      if (!userRoleIds.contains(ADMIN_ROLE))
        throw new AccessDeniedException(INSUFFICIENT_PRIVILEGES);

      String projectName = project.getString("Name");
      if (StringUtils.isBlank(projectName)) projectName = "Unnamed";

      lastVersion = 1;
      ifcdbModel = new IfcdbModel();
      ifcdbModel.setId(modelId);
      ifcdbModel.setName(projectName);
      ifcdbModel.setDescription(project.getString("Description"));
      ifcdbModel.getReadRoleIds().addAll(Set.of(getCurrentUserId()));
      ifcdbModel.getUploadRoleIds().addAll(Set.of(getCurrentUserId()));
      ifcdbModel.setLastVersion(lastVersion);
      modelCol.insertOne(ifcdbModel);
    }
    else // new version
    {
      // check user can upload model
      Set<String> updateRoleIds = ifcdbModel.getUploadRoleIds();
      if (!userRoleIds.contains(ADMIN_ROLE) && updateRoleIds != null &&
          Collections.disjoint(userRoleIds, updateRoleIds))
        throw new AccessDeniedException(INSUFFICIENT_PRIVILEGES);

      lastVersion = ifcdbModel.getLastVersion() + 1;
      ifcdbModel.setLastVersion(lastVersion);
      modelCol.replaceOne(eq("_id", modelId), ifcdbModel);
    }

    Document document = new Document();
    document.put("modelId", modelId);
    document.put("version", lastVersion);
    document.put("creationDate", getISODate());
    document.put("creationAuthor", getCurrentUserId());
    document.put("elementCount", mongoElements.getElements().size());

    MongoCollection<Document> versionCol = db.getCollection(VERSION_COL);
    versionCol.insertOne(document);

    for (Document element : mongoElements.getElements())
    {
      element.put("_modelId", modelId);
      element.put("_version", lastVersion);
    }

    MongoCollection<Document> ifcObjects = db.getCollection(OBJECT_COL);
    ifcObjects.insertMany(mongoElements.getElements());

    LOGGER.log(Level.INFO, "Model loaded in {0} seconds", chrono.totalSeconds());

    return ifcdbModel;
  }

  @Override
  public IfcdbModel updateModel(ExpressSchema schema, IfcdbModel model)
  {
    MongoDatabase db  = getDatabase(schema);

    String modelId = model.getId();

    MongoCollection<IfcdbModel> modelCol =
      db.getCollection(MODEL_COL, IfcdbModel.class);

    IfcdbModel prevModel = modelCol.find(eq("_id", modelId)).first();
    if (prevModel == null)
      throw new NotFoundException(MODEL_NOT_FOUND);

    model.setLastVersion(prevModel.getLastVersion());
    model = modelCol.findOneAndReplace(eq("_id", modelId), model);

    return model;
  }

  @Override
  public boolean deleteModel(ExpressSchema schema, String modelId, int version)
  {
    MongoDatabase db  = getDatabase(schema);

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
  public void execute(ExpressSchema schema, IfcdbCommand command, File file)
    throws IOException
  {
    MongoDatabase db  = getDatabase(schema);

    String outputFormat = command.getOutputFormat();

    var chrono = new Chronometer();

    String query = command.getQuery();

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

    if ("json".equals(outputFormat))
    {
      exportToJson(results, file);
    }
    else
    {
      MongoCollection<Document> objectsCol = db.getCollection(OBJECT_COL);
      MongoStepExporter exporter = new MongoStepExporter(schema, objectsCol);
      exporter.cacheDocuments(results);
      exporter.export(new OutputStreamWriter(
        new FileOutputStream(file)), results);
    }
    LOGGER.log(Level.INFO, "Data export: {0} seconds", chrono.seconds());
    LOGGER.log(Level.INFO,"Total time: {0} seconds", chrono.totalSeconds());
  }

  private MongoClient getMongoClient(ExpressSchema schema)
  {
    String dbAlias = schema.getName();
    String url = config.getOptionalValue("databases." + dbAlias + ".url",
      String.class).orElse(null);

    if (url == null)
      throw new RuntimeException("Missing server url for " + dbAlias);

    return clientManager.getMongoClient(url);
  }

  private MongoDatabase getDatabase(ExpressSchema schema)
  {
    MongoClient mongoClient = getMongoClient(schema);
    String dbAlias = schema.getName();
    String dbName = config.getOptionalValue("databases." + dbAlias + ".name",
      String.class).orElse(null);
    if (dbName == null) dbName = dbAlias;

    return mongoClient.getDatabase(dbName);
  }

  private Set<String> getCurrentUserRoleIds()
  {
    SecurityService securityService =
      CDI.current().select(SecurityService.class).get();

    return securityService.getCurrentUser().getRoleIds();
  }

  private String getCurrentUserId()
  {
    SecurityService securityService =
      CDI.current().select(SecurityService.class).get();

    return securityService.getCurrentUserId();
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
