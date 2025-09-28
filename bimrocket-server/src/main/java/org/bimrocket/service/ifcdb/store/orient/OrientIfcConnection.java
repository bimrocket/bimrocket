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
package org.bimrocket.service.ifcdb.store.orient;

import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.metadata.schema.OType;
import com.orientechnologies.orient.core.record.OEdge;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.record.OVertex;
import com.orientechnologies.orient.core.record.impl.ODocument;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.stream.Collectors;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.orient.OrientDecoder;
import org.bimrocket.dao.orient.OrientExpressionPrinter;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressSchema;
import static org.bimrocket.service.ifcdb.IfcdbService.MODEL_NOT_FOUND;
import org.bimrocket.service.ifcdb.store.IfcData;
import static org.bimrocket.service.ifcdb.store.orient.OrientIfcStore.LOGGER;
import static org.bimrocket.service.ifcdb.store.orient.OrientIfcStore.bsplineSurfaceClasses;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;
import org.bimrocket.service.ifcdb.store.IfcdbConnection;


/**
 *
 * @author realor
 */
public class OrientIfcConnection implements IfcdbConnection
{
  ODatabaseDocument db;
  ExpressSchema schema;
  int saveBlockSize = 10000;
  int deleteBlockSize = 5000;

  public OrientIfcConnection(ODatabaseDocument db, ExpressSchema schema)
  {
    this.db = db;
    this.schema = schema;
  }

  @Override
  public void createSchema()
  {
    createClasses(new OrientIfcSetup(db));
  }

  @Override
  public ExpressSchema getSchema()
  {
    return schema;
  }

  @Override
  public List<IfcdbModel> findModels(Expression filter,
    List<OrderByExpression> orderByList, Set<String> roleIds)
  {
    Map<String, Object> parameters;

    String query = "select * from IfcdbModel";

    if (roleIds.contains(ADMIN_ROLE))
    {
      parameters = Collections.emptyMap();
    }
    else
    {
      query += " where (readRoleIds is null or readRoleIds.size() = 0 or " +
       "readRoleIds containsany :roleIds)";
      parameters = Map.of("roleIds", roleIds);
    }

    if (filter != null)
    {
      query += parameters.isEmpty() ? " where " : " and ";
      query += OrientExpressionPrinter.toString(filter);
    }

    if (!orderByList.isEmpty())
    {
      query += " order by " + OrientExpressionPrinter.toString(orderByList);
    }

    List<IfcdbModel> models = new ArrayList<>();
    try (OResultSet rs = db.query(query, parameters))
    {
      while (rs.hasNext())
      {
        OResult next = rs.next();
        OElement omodel = next.getElement().orElse(null);
        IfcdbModel model = new IfcdbModel();
        OrientDecoder.create(IfcdbModel.class).copyToEntity(omodel, model);
        models.add(model);
      }
    }
    return models;
  }

  @Override
  public List<IfcdbVersion> getModelVersions(String modelId)
  {
    List<IfcdbVersion> versions = new ArrayList<>();

    OResultSet rs = db.query(
      "select version, creationAuthor, creationDate, elementCount " +
      "from IfcdbVersion where model.id = ? order by version", modelId);
    while (rs.hasNext())
    {
      OResult result = rs.next();
      IfcdbVersion version = new IfcdbVersion();
      version.setVersion(result.getProperty("version"));
      version.setCreationAuthor(result.getProperty("creationAuthor"));
      version.setCreationDate(result.getProperty("creationDate"));
      version.setElementCount(result.getProperty("elementCount"));
      versions.add(version);
    }
    return versions;
  }

  @Override
  public IfcdbModel createModel(IfcdbModel model)
  {
    ODocument omodel = new ODocument("IfcdbModel");
    omodel.setProperty("id", model.getId());
    omodel.setProperty("name", model.getName());
    omodel.setProperty("description", model.getDescription());
    omodel.setProperty("readRoleIds", model.getReadRoleIds());
    omodel.setProperty("uploadRoleIds", model.getUploadRoleIds());
    omodel.setProperty("lastVersion", 0);
    db.save(omodel);

    return model;
  }

  @Override
  public IfcdbVersion createModelVersion(String modelId,
    IfcdbVersion ifcdbVersion)
  {
    try (OResultSet rs = db.query("select from IfcdbModel where id = ? ",
         modelId))
    {
      if (rs.hasNext())
      {
        OElement omodel = rs.next().getElement().orElse(null);
        if (omodel != null)
        {
          int lastVersion = omodel.getProperty("lastVersion");
          ifcdbVersion.setVersion(lastVersion + 1);

          omodel.setProperty("lastVersion", ifcdbVersion.getVersion());
          db.save(omodel);

          ODocument oversion = new ODocument("IfcdbVersion");
          oversion.setProperty("model", omodel);
          oversion.setProperty("version", ifcdbVersion.getVersion());
          oversion.setProperty("creationDate", ifcdbVersion.getCreationDate());
          oversion.setProperty("creationAuthor", ifcdbVersion.getCreationAuthor());
          oversion.setProperty("elementCount", 0);
          db.save(oversion);

          return ifcdbVersion;
        }
      }
    }
    throw new NotFoundException(MODEL_NOT_FOUND);
  }

  @Override
  public IfcdbModel getModel(String modelId)
  {
    try (OResultSet rs = db.query("select from IfcdbModel where id = ? ",
         modelId))
    {
      if (!rs.hasNext()) return null;

      IfcdbModel ifcdbModel = new IfcdbModel();
      OElement omodel = rs.next().getElement().get();
      OrientDecoder.create(IfcdbModel.class).copyToEntity(omodel, ifcdbModel);
      return ifcdbModel;
    }
  }

  @Override
  public IfcdbModel updateModel(IfcdbModel model)
  {
    try (OResultSet rs = db.query("select from IfcdbModel where id = ? ",
         model.getId()))
    {
      if (!rs.hasNext())
        throw new NotFoundException(MODEL_NOT_FOUND);

      OElement omodel = rs.next().getElement().get();
      omodel.setProperty("name", model.getName());
      omodel.setProperty("description", model.getDescription());
      omodel.setProperty("readRoleIds", model.getReadRoleIds());
      omodel.setProperty("uploadRoleIds", model.getUploadRoleIds());
      db.save(omodel);
      OrientDecoder.create(IfcdbModel.class).copyToEntity(omodel, model);
      return model;
    }
  }

  @Override
  public boolean deleteModel(String modelId, int version)
  {
    db.begin();

    String versionFilter = version == 0 ? "" : " and version = " + version;

    // Remove recursivelly all instances of IfcBSplineSurface.
    // The property ControlPointsList of this class has references to
    // IfcCartesianPoints that can not be deleted with the traverse command.

    String classListString = bsplineSurfaceClasses.stream()
      .map(s -> "'" + s + "E'")
      .collect(Collectors.joining(","));

    String query = "select expand(out(" + classListString + ")) " +
      " from IfcdbVersion where model.id = ? " + versionFilter;

    var orientIfcDeleter = new OrientIfcDeleter(db);
    try (OResultSet rs = db.query(query, modelId))
    {
      rs.elementStream().forEach(element -> orientIfcDeleter.delete(element));
    }

    int totalCount = orientIfcDeleter.getTotalCount();

    query = "delete vertex from " +
      "(traverse * from " +
      " (select expand(*) from " +
      "  (select out('IfcE') from IfcdbVersion " +
      "   where model.id = ? " + versionFilter + ") " +
      "  limit " + deleteBlockSize + ") " +
      " while @this instanceof IfcV)";

    int deleteCount = count(db.command(query, modelId));
    while (deleteCount > 0)
    {
      LOGGER.log(Level.INFO, "{0} objects deleted.", deleteCount);
      totalCount += deleteCount;
      db.commit();

      deleteCount = count(db.command(query, modelId));
    }

    LOGGER.log(Level.INFO, "Total objects deleted: {0}.", totalCount);

    if (version == 0) // remove all versions
    {
      db.command("delete vertex from IfcdbVersion " +
        "where model.id = ?", modelId);

      db.command("delete vertex from IfcdbModel " +
        "where id = ?", modelId);
    }
    else // remove the specified version
    {
      db.command("delete vertex from IfcdbVersion " +
        "where model.id = ? and version = ?", modelId, version);

      try (OResultSet rs = db.query("select max(version) as lastVersion " +
           "from IfcdbVersion where model.id = ?", modelId))
      {
        if (rs.hasNext()) // at least one version exists
        {
          int lastVersion = rs.next().getProperty("lastVersion");
          db.command("update IfcdbModel set lastVersion = ? " +
           "where id = ?", lastVersion, modelId);
        }
        else
        {
          db.command("delete vertex from IfcdbModel where id = ?", modelId);
        }
      }
    }

    db.commit();

    return totalCount > 0;
  }

  @Override
  public IfcData createData()
  {
    return new OrientIfcData(schema, new OrientIfcSetup(db),
      bsplineSurfaceClasses);
  }

  @Override
  public IfcData loadData(String modelId, int version)
  {
    var data = new OrientIfcData(schema, new OrientIfcSetup(db),
      bsplineSurfaceClasses);

    OResultSet rs;
    if (version == 0) // get last model version
    {
      rs = db.query(
        "traverse * from " +
        "(select expand(out('IfcE')) from IfcdbVersion " +
        "where model.id = ? and model.lastVersion = version) " +
        "while @this instanceof IfcV", modelId);
    }
    else
    {
      rs = db.query(
        "traverse * from " +
        "(select expand(out('IfcE')) from IfcdbVersion " +
         "where model.id = ? and version = ?) " +
         "while @this instanceof IfcV", modelId, version);
    }

    try (rs)
    {
      rs.elementStream().forEach(element ->
      {
        data.getElements().add(element);
        // add element to the local cache to speed up traversal
        db.getLocalCache().updateRecord(element);

        if (data.ifcProject == null &&
            "IfcProject".equals(element.getSchemaType().get().getName()))
        {
          data.ifcProject = element;
        }
      });
    }

    if (data.getElements().isEmpty())
      throw new NotFoundException(MODEL_NOT_FOUND);

    return data;
  }

  @Override
  public void saveData(String modelId, int version, IfcData data)
  {
    OrientIfcData orientData = (OrientIfcData)data;

    // create IFC classes for relationships in orientdb schema

    var orientSetup = orientData.getOrientSetup();

    List<OElement> elements = orientData.getElements();
    Set<OElement> rootElements = orientData.getRootElements();
    for (OElement oelement : rootElements)
    {
      String className = oelement.getSchemaType().get().getName() + "E";
      orientSetup.createClassIfNotExists(className, "IfcE");
    }

    db.begin();

    OVertex oversion = null;
    OResultSet rs = db.query(
      "select from IfcdbVersion where model.id = ? and version = ?",
      modelId, version);
    if (rs.hasNext())
    {
      oversion = rs.next().getVertex().get();
    }
    else throw new RuntimeException("Model version not found.");

    var orientIfcSaver = new OrientIfcSaver(db);

    LOGGER.log(Level.INFO, "Total elements: {0}", elements.size());
    LOGGER.log(Level.INFO, "Root elements: {0}", rootElements.size());

    // save root elements and link them to the model version
    int saveCount = 0;
    for (OElement oelement : rootElements)
    {
      saveCount += orientIfcSaver.save(oelement);

      String className = oelement.getSchemaType().get().getName() + "E";
      OEdge oedge = db.newEdge(oversion, oelement.asVertex().get(), className);

      db.save(oedge);

      if (saveCount > saveBlockSize)
      {
        LOGGER.log(Level.INFO, "{0} objects saved.", saveCount);
        db.commit();
        db.begin();
        saveCount = 0;
      }
    }

    // update the number of elements saved
    oversion.setProperty("elementCount", orientIfcSaver.getTotalCount());
    db.save(oversion);

    LOGGER.log(Level.INFO, "Total objects saved: {0}",
      orientIfcSaver.getTotalCount());

    db.commit();
  }

  @Override
  public IfcData queryData(String query, String language)
  {
    var data = new OrientIfcData(schema, new OrientIfcSetup(db),
      bsplineSurfaceClasses);

    try (OResultSet rs = db.query(query))
    {
      rs.elementStream().forEach(element ->
      {
        data.getElements().add(element);
       // add element to the local cache to speed up traversal
        db.getLocalCache().updateRecord(element);

        if (data.ifcProject == null &&
            "IfcProject".equals(element.getSchemaType().get().getName()))
        {
          data.ifcProject = element;
        }
      });
    }
    return data;
  }

  @Override
  public void execute(String query, String language, File outputFile)
    throws IOException
  {
    db.begin();

    ArrayList<OResult> results = new ArrayList<>();
    try (OResultSet rs = db.command(query))
    {
      rs.stream().forEach(result -> results.add(result));
    }

    exportToJson(results, outputFile);

    db.commit();
  }

  @Override
  public void begin()
  {
    db.begin();
  }

  @Override
  public void commit()
  {
    db.commit();
  }

  @Override
  public void rollback()
  {
    db.rollback();
  }

  @Override
  public void close()
  {
    db.close();
  }

  private int count(OResultSet rs)
  {
    try (rs)
    {
      if (rs.hasNext())
      {
        OResult row = rs.next();
        Number count = (Number)row.getProperty("count");
        return count.intValue();
      }
      return 0;
    }
  }

  private void createClasses(OrientIfcSetup setup)
  {
    OClass modelClass = setup.getClass("IfcdbModel");
    if (modelClass == null)
    {
      modelClass = setup.createVertexClass("IfcdbModel");
      modelClass.createProperty("id", OType.STRING); // project GlobalId
      modelClass.createProperty("name", OType.STRING);
      modelClass.createProperty("description", OType.STRING);
      modelClass.createProperty("lastVersion", OType.INTEGER);
      modelClass.createProperty("readRoleIds", OType.EMBEDDEDSET, OType.STRING);
      modelClass.createProperty("uploadRoleIds", OType.EMBEDDEDSET, OType.STRING);
    }
    setup.createIndex(modelClass, "IfcdbModelIdIdx",
      OClass.INDEX_TYPE.UNIQUE_HASH_INDEX, "id");

    OClass versionClass = setup.getClass("IfcdbVersion");
    if (versionClass == null)
    {
      versionClass = setup.createVertexClass("IfcdbVersion");
      versionClass.createProperty("model", OType.LINK, modelClass);
      versionClass.createProperty("version", OType.INTEGER);
      versionClass.createProperty("creationDate", OType.STRING);
      versionClass.createProperty("creationAuthor", OType.STRING);
      versionClass.createProperty("elementCount", OType.INTEGER);
    }

    OClass ifcVClass = setup.getClass("IfcV");
    if (ifcVClass == null)
    {
      ifcVClass = setup.createVertexClass("IfcV");
      ifcVClass.setAbstract(true);
    }

    OClass ifcEClass = setup.getClass("IfcE");
    if (ifcEClass == null)
    {
      setup.createEdgeClass("IfcE");
    }

    ExpressEntity ifcRootEntity = (ExpressEntity)schema.getNamedType("IfcRoot");

    OClass ifcRootClass = setup.createClass(ifcRootEntity);

    setup.createIndex(ifcRootClass, "IfcRootGlobalIdIdx",
      OClass.INDEX_TYPE.NOTUNIQUE_HASH_INDEX, "GlobalId");

    setup.createFunction("getIfcV", "sql",
      "traverse * from (select expand(out('IfcE')) from IfcdbVersion " +
      "where (model.name like :id_name or model.id = :id_name) " +
      "and (version = :version or (:version = 0 and version = model.lastVersion))) " +
      "while @this instanceof IfcV", true,
      "id_name", "version");
  }

  private void exportToJson(List<OResult> results, File file) throws IOException
  {
    try (PrintWriter writer = new PrintWriter(file, "UTF-8"))
    {
      writer.print("[");
      for (int i = 0; i < results.size(); i++)
      {
        OResult result = results.get(i);
        if (i > 0) writer.println(",");
        writer.print(result.toJSON());
      }
      writer.print("]");
    }
  }
}
