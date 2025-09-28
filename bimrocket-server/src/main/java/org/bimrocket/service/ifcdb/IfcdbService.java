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
package org.bimrocket.service.ifcdb;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import static org.apache.commons.lang3.StringUtils.isBlank;
import org.bimrocket.api.ifcdb.IfcdbCommand;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.expression.io.log.LogExpressionPrinter;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.data.ExpressCursor;
import org.bimrocket.express.io.ExpressLoader;
import org.bimrocket.service.ifcdb.store.IfcData;
import org.bimrocket.service.ifcdb.store.IfcdbConnection;
import org.bimrocket.service.ifcdb.store.empty.EmptyIfcStore;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.util.EntityDefinition;
import org.eclipse.microprofile.config.Config;
import org.bimrocket.step.io.StepExporter;
import org.bimrocket.step.io.StepLoader;
import org.bimrocket.service.ifcdb.store.IfcdbStore;
import org.bimrocket.util.Chronometer;
import static org.bimrocket.util.TextUtils.getISODate;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class IfcdbService
{
  static final Logger LOGGER =
    Logger.getLogger(IfcdbService.class.getName());

  static final String BASE = "services.ifcdb.";

  public static final Map<String, Field> modelFieldMap =
    EntityDefinition.getInstance(IfcdbModel.class).getFieldMap();

  Map<String, ExpressSchema> schemas = new HashMap<>();

  // Exceptions

  public static final String MODEL_NOT_FOUND =
    "IFC001: Model not found.";
  public static final String UNSUPPORTED_SCHEMA =
    "IFC001: Unsupported schema.";
  public static final String MODEL_ID_IS_REQUIRED =
    "IFC002: Model id is required.";
  public static final String MODEL_NAME_IS_REQUIRED =
    "IFC003: Model name is required.";
  public static final String INVALID_IFC =
    "IFC004: Invalid IFC file.";
  public static final String INSUFFICIENT_PRIVILEGES =
    "IFC005: Insufficient privileges.";
  public static final String MODEL_TOO_LARGE =
    "IFC006: Model too large.";

  @Inject
  Config config;

  IfcdbStore store;

  @Inject
  SecurityService securityService;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init IfcDatabaseService");

    CDI<Object> cdi = CDI.current();

    try
    {
      @SuppressWarnings("unchecked")
      Class<IfcdbStore> storeClass =
        config.getValue(BASE + "store.class", Class.class);
      store = cdi.select(storeClass).get();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, "Error initializing IfcStore: {0}: {1}",
        new Object[] {
          config.getOptionalValue(BASE + "store.class", String.class).orElse(null),
          ex.toString()
      });
      store = new EmptyIfcStore();
    }
    LOGGER.log(Level.INFO, "IfcStore: {0}", store.getClass());

    List<String> schemaNames =
      config.getOptionalValues(BASE + "schemas", String.class)
        .orElse(List.of("IFC4"));

    for (String schemaName : schemaNames)
    {
      try
      {
        ExpressLoader expressParser = new ExpressLoader();
        ExpressSchema schema = expressParser.load("schema:" + schemaName);
        LOGGER.log(Level.INFO, "{0} schema loaded: {1} named types",
          new Object[]{ schema.getName(), schema.getNamedTypes().size()});

        try (IfcdbConnection conn = store.getConnection(schema))
        {
          conn.createSchema();
          schemas.put(schemaName, schema);
        }
      }
      catch (Exception ex)
      {
        LOGGER.log(Level.SEVERE, "Error initializing schema : {0}: {1}",
          new Object[]{schemaName, ex});
      }
    }
  }

  public List<IfcdbModel> getModels(String schemaName,
    Expression filter, List<OrderByExpression> orderByList)
  {
    LOGGER.log(Level.FINE, "schema: {0}, filter: {1}",
      new Object[] { schemaName, LogExpressionPrinter.toString(filter) });

    Set<String> roleIds = securityService.getCurrentUser().getRoleIds();

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    try (var conn = store.getConnection(schema))
    {
      return conn.findModels(filter, orderByList, roleIds);
    }
  }

  public List<IfcdbVersion> getModelVersions(String schemaName, String modelId)
    throws IOException
  {
    LOGGER.log(Level.FINE, "schema: {0}, modelId: {1}",
      new Object[] { schemaName, modelId });

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    try (var conn = store.getConnection(schema))
    {
      return conn.getModelVersions(modelId);
    }
  }

  public void downloadModel(String schemaName, String modelId, int version,
    File ifcFile) throws IOException
  {
    LOGGER.log(Level.FINE, "schema: {0}, modelId: {1}",
      new Object[] { schemaName, modelId });

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    try (var conn = store.getConnection(schema))
    {
      var chrono = new Chronometer();

      IfcdbModel ifcdbModel = conn.getModel(modelId);
      if (version == 0)
      {
        version = ifcdbModel.getLastVersion();
      }

      IfcData data = conn.loadData(modelId, version);

      LOGGER.log(Level.INFO,
        "IFC objects loaded in {0} seconds.", chrono.seconds());
      chrono.mark();

      var exporter = new StepExporter(data);

      var headerData = exporter.getHeaderData();

      String fileName = ifcdbModel.getName();
      if (fileName != null && fileName.trim().length() > 0)
      {
        fileName = fileName.trim().replace(" ", "_");
        if (version > 0) fileName += "-v" + version;
        fileName += ".ifc";
        headerData.getFileName().setName(fileName);
      }

      String description = ifcdbModel.getDescription();
      if (description != null)
      {
        headerData.getFileDescription().setDescription(List.of(description));
      }

      exporter.export(ifcFile);

      LOGGER.log(Level.INFO,
        "IFC file created in {0} seconds.", chrono.seconds());

      LOGGER.log(Level.INFO,
        "Total time: {0} seconds.", chrono.totalSeconds());
    }
  }

  public IfcdbModel uploadModel(String schemaName, File ifcFile)
    throws IOException
  {
    LOGGER.log(Level.FINE, "schema: {0}", schemaName);

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    long maxFileSizeMb =
      config.getOptionalValue(BASE + "maxFileSizeMb", Long.class).orElse(0L);

    if (maxFileSizeMb > 0)
    {
      long fileSizeMb = ifcFile.length() / 1048576L;

      if (fileSizeMb > maxFileSizeMb)
        throw new InvalidRequestException(MODEL_TOO_LARGE);
    }

    try (var conn = store.getConnection(schema))
    {
      var chrono = new Chronometer();

      IfcData data = conn.createData();

      var loader = new StepLoader(data);

      loader.load(ifcFile);

      LOGGER.log(Level.INFO,
        "IFC file loaded in {0} seconds.", chrono.seconds());
      chrono.mark();

      ExpressCursor project = data.getIfcProject();
      if (project == null) throw new IOException(INVALID_IFC);

      String modelId = project.get("GlobalId");
      if (modelId == null) throw new IOException(INVALID_IFC);

      int version;
      IfcdbModel ifcdbModel = conn.getModel(modelId);
      if (ifcdbModel == null)
      {
        String modelName = project.get("Name");
        if (modelName == null || modelName.trim().length() == 0)
        {
          modelName = "New model";
        }
        ifcdbModel = new IfcdbModel();
        ifcdbModel.setId(modelId);
        ifcdbModel.setName(modelName);
        ifcdbModel.setDescription(project.get("Description"));
        ifcdbModel.setReadRoleIds(Set.of(getCurrentUserId()));
        ifcdbModel.setUploadRoleIds(Set.of(getCurrentUserId()));
        ifcdbModel = conn.createModel(ifcdbModel);
      }
      IfcdbVersion ifcdbVersion = new IfcdbVersion();
      ifcdbVersion.setCreationDate(getISODate());
      ifcdbVersion.setCreationAuthor(getCurrentUserId());
      ifcdbVersion = conn.createModelVersion(modelId, ifcdbVersion);
      version = ifcdbVersion.getVersion();

      LOGGER.log(Level.INFO,
        "Version created in {0} seconds.", chrono.seconds());
      chrono.mark();

      conn.saveData(modelId, version, data);

      LOGGER.log(Level.INFO,
        "IFC objects saved in {0} seconds.", chrono.seconds());

      LOGGER.log(Level.INFO,
        "Total time: {0} seconds.", chrono.totalSeconds());

      return ifcdbModel;
    }
  }

  public IfcdbModel updateModel(String schemaName, IfcdbModel model)
  {
    LOGGER.log(Level.FINE, "schema: {0}, modelName: {1}",
      new Object[] { schemaName, model.getName() });

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    if (isBlank(model.getId()))
      throw new InvalidRequestException(MODEL_ID_IS_REQUIRED);

    if (isBlank(model.getName()))
      throw new InvalidRequestException(MODEL_NAME_IS_REQUIRED);

    try (var conn = store.getConnection(schema))
    {
      return conn.updateModel(model);
    }
  }

  public boolean deleteModel(String schemaName, String modelId, int version)
  {
    LOGGER.log(Level.FINE, "schema: {0}, modelId: {1}",
      new Object[] { schemaName, modelId });

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    try (var conn = store.getConnection(schema))
    {
      var chrono = new Chronometer();

      boolean deleted = conn.deleteModel(modelId, version);

      LOGGER.log(Level.INFO,
        "Total time: {0} seconds.", chrono.totalSeconds());

      return deleted;
    }
  }

  public void execute(String schemaName, IfcdbCommand command, File file)
    throws IOException
  {
    LOGGER.log(Level.FINE, "command: {0}", command.getQuery());

    ExpressSchema schema = schemas.get(schemaName);
    if (schema == null) throw new InvalidRequestException(UNSUPPORTED_SCHEMA);

    String query = command.getQuery();
    String language = command.getLanguage();
    String outputFormat = command.getOutputFormat();

    try (var conn = store.getConnection(schema))
    {
      var chrono = new Chronometer();

      if (outputFormat.equals("json"))
      {
        conn.execute(query, language, file);
      }
      else // ifc
      {
        IfcData data = conn.queryData(query, language);

        LOGGER.log(Level.INFO,
          "IFC objects loaded in {0} seconds.", chrono.seconds());
        chrono.mark();

        var exporter = new StepExporter(data);

        var headerData = exporter.getHeaderData();
        headerData.getFileName().setName("query.ifc");

        exporter.export(file);

        LOGGER.log(Level.INFO,
          "IFC file created in {0} seconds.", chrono.seconds());
      }
      LOGGER.log(Level.INFO,
        "Total time: {0} seconds.", chrono.totalSeconds());
    }
  }

  private String getCurrentUserId()
  {
    return securityService.getCurrentUserId();
  }
}
