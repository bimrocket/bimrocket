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
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;
import org.bimrocket.api.ifcdb.IfcdbCommand;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.orient.OrientDecoder;
import org.bimrocket.dao.orient.OrientExpressionPrinter;
import org.bimrocket.dao.orient.OrientPoolManager;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressSchema;
import static org.bimrocket.service.ifcdb.IfcDatabaseService.INSUFFICIENT_PRIVILEGES;
import static org.bimrocket.service.ifcdb.IfcDatabaseService.INVALID_IFC;
import static org.bimrocket.service.ifcdb.IfcDatabaseService.MODEL_NOT_FOUND;
import org.bimrocket.service.ifcdb.store.IfcStore;
import org.bimrocket.service.ifcdb.store.orient.OrientStepLoader.OrientElements;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.Chronometer;
import static org.bimrocket.util.TextUtils.getISODate;

/**
 *
 * @author realor
 */
public class OrientIfcStore implements IfcStore
{
  static final Logger LOGGER =
    Logger.getLogger(OrientIfcStore.class.getName());

  static final List<String> supportedQueryLanguages = List.of("OrientDBSQL");

  @Inject
  OrientPoolManager poolManager;

  int commitSize = 10000;

  @Override
  public void createSchema(ExpressSchema schema) throws IOException
  {
    String schemaName = schema.getName();
    try (ODatabaseDocument db = getConnection(schemaName))
    {
      createClasses(new OrientIfcSetup(db), schema);
    }
  }

  @Override
  public List<String> getSupportedQueryLanguages()
  {
    return supportedQueryLanguages;
  }

  @Override
  public List<IfcdbModel> getModels(ExpressSchema schema,
    Expression filter, List<OrderByExpression> orderByList,
    Set<String> roleIds)
  {
    String dbAlias = schema.getName();
    try (ODatabaseDocument db = getConnection(dbAlias))
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
        query += parameters.isEmpty() ? " where" : " and";
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
  }

  @Override
  public List<IfcdbVersion> getModelVersions(ExpressSchema schema, String modelId)
  {
    List<IfcdbVersion> versions = new ArrayList<>();
    String dbAlias = schema.getName();
    try (ODatabaseDocument db = getConnection(dbAlias))
    {
      OResultSet rs = db.query(
        "select version, creationAuthor, creationDate, " +
        "out('IfcE').size() as elementCount " +
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
    }
    return versions;
  }

  @Override
  public void downloadModel(ExpressSchema schema, String modelId, int version,
    File ifcFile) throws IOException
  {
    String dbAlias = schema.getName();

    ArrayList<OElement> elements = new ArrayList<>();
    var chrono = new Chronometer();

    try (ODatabaseDocument db = getConnection(dbAlias))
    {
      if (version == 0) // get last model version
      {
        try (OResultSet rs = db.query(
          "traverse * from " +
          "(select expand(out('IfcE')) from IfcdbVersion " +
          "where model.id = ? and model.lastVersion = version) " +
          "while @this instanceof IfcV", modelId))
        {
          rs.elementStream().forEach(element -> elements.add(element));
        }
      }
      else
      {
        try (OResultSet rs = db.query(
          "traverse * from " +
          "(select expand(out('IfcE')) from IfcdbVersion " +
           "where model.id = ? and version = ?) " +
           "while @this instanceof IfcV", modelId, version))
        {
          rs.elementStream().forEach(element -> elements.add(element));
        }
      }
      if (elements.isEmpty())
        throw new NotFoundException(MODEL_NOT_FOUND);

      // add elements to the local cache to speed up traversal
      for (OElement element : elements)
      {
        db.getLocalCache().updateRecord(element);
      }

      LOGGER.log(Level.INFO, "Query execution: {0} seconds", chrono.seconds());
      chrono.mark();

      OrientStepExporter exporter = new OrientStepExporter(schema);
      exporter.export(new OutputStreamWriter(
        new FileOutputStream(ifcFile)), elements);

      LOGGER.log(Level.INFO,"IFC export: {0} seconds", chrono.seconds());
      LOGGER.log(Level.INFO,"Total time: {0} seconds", chrono.totalSeconds());
    }
  }

  @Override
  public IfcdbModel uploadModel(ExpressSchema schema, File ifcFile)
    throws IOException
  {
    LOGGER.log(Level.INFO, "Model size: {0}", ifcFile.length());

    var chrono = new Chronometer();

    String dbAlias = schema.getName();
    try (ODatabaseDocument db = getConnection(dbAlias))
    {
      OrientStepLoader loader = new OrientStepLoader(db, schema);
      OrientElements oelements = loader.load(ifcFile);

      var orientSetup = new OrientIfcSetup(db);
      for (ODocument oelement : oelements.getRootElements())
      {
        String className = oelement.getSchemaType().get().getName() + "E";
        orientSetup.createClassIfNotExists(className, "IfcE");
      }

      LOGGER.log(Level.INFO,
        "IFC objects created ({0} roots) in {1} seconds.",
        new Object[]{ oelements.getRootElements().size(), chrono.seconds() });
      chrono.mark();

      ODocument oproject = oelements.getProject();
      if (oproject == null) throw new IOException(INVALID_IFC);
      String modelId = oproject.getProperty("GlobalId");
      if (modelId == null) throw new IOException(INVALID_IFC);

      Set<String> userRoleIds = getCurrentUserRoleIds();

      db.begin();
      OVertex omodel;
      int lastVersion = 0;
      try (OResultSet rs = db.query("select from IfcdbModel where id = ?",
           modelId))
      {
        if (rs.hasNext()) // previous model version exists
        {
          omodel = rs.next().getVertex().get();
          lastVersion = omodel.getProperty("lastVersion");

          // check user can upload model
          Set<String> updateRoleIds = omodel.getProperty("updateRoleIds");
          if (!userRoleIds.contains(ADMIN_ROLE) && updateRoleIds != null &&
              Collections.disjoint(userRoleIds, updateRoleIds))
            throw new AccessDeniedException(INSUFFICIENT_PRIVILEGES);
        }
        else // new model
        {
          if (!userRoleIds.contains(ADMIN_ROLE))
            throw new AccessDeniedException(INSUFFICIENT_PRIVILEGES);

          String projectName = oproject.getProperty("Name");
          if (StringUtils.isBlank(projectName)) projectName = "Unnamed";
          omodel = db.newVertex("IfcdbModel");
          omodel.setProperty("id", modelId);
          omodel.setProperty("name", projectName);
          omodel.setProperty("description", oproject.getProperty("Description"));
          omodel.setProperty("readRoleIds", Set.of(getCurrentUserId()));
          omodel.setProperty("uploadRoleIds", Set.of(getCurrentUserId()));
        }
      }
      omodel.setProperty("lastVersion", lastVersion + 1);

      OVertex oversion = db.newVertex("IfcdbVersion");
      oversion.setProperty("model", omodel);
      oversion.setProperty("version", lastVersion + 1);
      oversion.setProperty("creationDate", getISODate());
      oversion.setProperty("creationAuthor", getCurrentUserId());

      db.save(oversion);

      LOGGER.log(Level.INFO,
        "Version saved in {0} seconds.", chrono.seconds());
      chrono.mark();

      var orientGraphSaver = new OrientGraphSaver(db);

      // save root elements and link them to the model version
      int saveCount = 0;
      for (ODocument oelement : oelements.getRootElements())
      {
        saveCount += orientGraphSaver.save(oelement);

        String className = oelement.getSchemaType().get().getName() + "E";
        OEdge oedge = db.newEdge(oversion, oelement.asVertex().get(), className);

        db.save(oedge);

        if (saveCount > commitSize)
        {
          LOGGER.log(Level.INFO, "Commiting {0} objects.", saveCount);
          db.commit();
          db.begin();
          saveCount = 0;
        }
      }

      db.commit();

      LOGGER.log(Level.INFO,
        "{0} IFC objects saved in {1} seconds.",
        new Object[]{ orientGraphSaver.getTotalCount(), chrono.seconds() });
      chrono.mark();

      IfcdbModel model = new IfcdbModel();
      OrientDecoder.create(IfcdbModel.class).copyToEntity(omodel, model);

      LOGGER.log(Level.INFO,
        "Total time: {0} seconds.", chrono.totalSeconds());

      return model;
    }
  }

  @Override
  public IfcdbModel updateModel(ExpressSchema schema, IfcdbModel model)
  {
    String dbAlias = schema.getName();
    try (ODatabaseDocument db = getConnection(dbAlias))
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
  }

  @Override
  public boolean deleteModel(ExpressSchema schema, String modelId, int version)
  {
    String dbAlias = schema.getName();

    var chrono = new Chronometer();

    try (ODatabaseDocument db = getConnection(dbAlias))
    {
      int count;
      db.begin();
      if (version == 0) // remove all versions
      {
        db.command("delete vertex from " +
          "(traverse * from " +
          " (select expand(out('IfcE')) " +
          "  from IfcdbVersion where model.id = ?)" +
          " while @this instanceof IfcV)", modelId);

        LOGGER.log(Level.INFO,
          "Objects removed in {0} seconds.", chrono.seconds());
        chrono.mark();

        count = count(db.command("delete vertex from IfcdbVersion " +
          "where model.id = ?", modelId));

        db.command("delete vertex from IfcdbModel " +
          "where id = ?", modelId);
      }
      else // remove the specified version
      {
        db.command("delete vertex from " +
          "(select expand(*) from " +
          " (select expand(difference(" +
          "  (select set(@rid) from " +
          "   (traverse * from " +
          "     (select expand(out('IfcE')) " +
          "      from IfcdbVersion where model.id = :id and version = :version) " +
          "    while @this instanceof IfcV)), " +
          "  (select set(@rid) from " +
          "   (traverse * from " +
          "    (select expand(out('IfcE')) " +
          "     from IfcdbVersion where model.id = :id and version <> :version) " +
          "    while @this instanceof IfcV))))))",
          Map.of("id", modelId, "version", version));

        LOGGER.log(Level.INFO,
          "Objects removed in {0} seconds.", chrono.seconds());
        chrono.mark();

        count = count(db.command("delete vertex from IfcdbVersion " +
          "where model.id = ? and version = ?", modelId, version));

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
            db.command("delete vertex from IfcdbModel " +
             "where id = ?", modelId);
          }
        }
      }
      LOGGER.log(Level.INFO,
        "Version/s removed in {0} seconds.", chrono.seconds());
      chrono.mark();

      db.commit();

      LOGGER.log(Level.INFO,
        "Total time: {0} seconds.", chrono.totalSeconds());

      return count > 0;
    }
  }

  @Override
  public void execute(ExpressSchema schema, IfcdbCommand command, File file)
    throws IOException
  {
    String dbAlias = schema.getName();

    try (ODatabaseDocument db = getConnection(dbAlias))
    {
      db.begin();
      String outputFormat = command.getOutputFormat();

      if ("json".equals(outputFormat))
      {
        ArrayList<OResult> results = new ArrayList<>();
        try (OResultSet rs = db.command(command.getQuery()))
        {
          rs.stream().forEach(result -> results.add(result));
        }
        exportToJson(results, file);
      }
      else
      {
        ArrayList<OElement> elements = new ArrayList<>();
        try (OResultSet rs = db.query(command.getQuery()))
        {
          rs.elementStream().forEach(element -> elements.add(element));
        }
        OrientStepExporter exporter = new OrientStepExporter(schema);
        exporter.export(new OutputStreamWriter(
          new FileOutputStream(file)), elements);
      }
      db.commit();
    }
  }

  // internal methods

  private ODatabaseDocument getConnection(String dbAlias)
  {
    return poolManager.getDocumentConnection(dbAlias);
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

  private void createClasses(OrientIfcSetup setup, ExpressSchema schema)
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
      versionClass.createProperty("creationUserId", OType.STRING);
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
