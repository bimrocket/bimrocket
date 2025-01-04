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

import com.orientechnologies.orient.core.db.ODatabaseSession;
import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.bimrocket.api.ifcdb.IfcDeleteResult;
import org.bimrocket.api.ifcdb.IfcCommand;
import org.bimrocket.api.ifcdb.IfcUploadResult;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.io.ExpressLoader;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class IfcDatabaseService
{
  static final Logger LOGGER =
    Logger.getLogger(IfcDatabaseService.class.getName());

  static final String BASE = "services.ifcdb.";

  @Inject
  Config config;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init IfcdbService");
  }

  public void execute(String schemaName, IfcCommand command, File file)
    throws Exception
  {
    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:" + schemaName);

    String dbName = schemaName;

    try (OrientDB orientDB = getServer())
    {
      try (ODatabaseDocument db = openDB(orientDB, dbName))
      {
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
      }
    }
  }

  public void getModel(String schemaName, String modelId, File ifcFile)
    throws Exception
  {
    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:" + schemaName);

    String dbName = schemaName;

    try (OrientDB orientDB = getServer())
    {
      ArrayList<OElement> elements = new ArrayList<>();

      try (ODatabaseDocument db = openDB(orientDB, dbName))
      {
        try (OResultSet rs = db.query("select expand(Entities) from IfcModel where Id = ?", modelId))
        {
          rs.elementStream().forEach(element -> elements.add(element));
        }
        if (elements.isEmpty()) throw new Exception("There is no model with that Id");

        OrientStepExporter exporter = new OrientStepExporter(schema);
        exporter.export(new OutputStreamWriter(
          new FileOutputStream(ifcFile)), elements);
      }
    }
  }

  public IfcUploadResult putModel(String schemaName, String modelId, File ifcFile)
    throws Exception
  {
    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:" + schemaName);

    String dbName = schemaName;

    IfcUploadResult uploadResult = new IfcUploadResult();

    try (OrientDB orientDB = getServer())
    {
      try (ODatabaseDocument db = openDB(orientDB, dbName))
      {
        try (OResultSet rs = db.query("select 1 from IfcModel where Id = ?", modelId))
        {
          if (rs.hasNext())
            throw new Exception("A model with that identifier already exists");
        }

        OrientStepLoader loader = new OrientStepLoader(db, schema);
        OElement model = loader.load(ifcFile);

        model.setProperty("Id", modelId);
        LOGGER.log(Level.INFO, "Saving model {0}", modelId);
        db.save(model);

        List<? extends Object> elements =
          (List<? extends Object>)model.getProperty("Entities");
        uploadResult.setCount(elements.size());
      }
    }
    return uploadResult;
  }

  public IfcDeleteResult deleteModel(String schemaName, String modelId)
    throws Exception
  {
    String dbName = schemaName;
    IfcDeleteResult deleteResult = new IfcDeleteResult();

    try (OrientDB orientDB = getServer())
    {
      try (ODatabaseDocument db = openDB(orientDB, dbName))
      {
        try (OResultSet rs = db.command(
          "delete from (select expand(Entities) from IfcModel where Id = ?)", modelId))
        {
          if (rs.hasNext())
          {
            OResult row = rs.next();
            Number count = (Number)row.getProperty("count");
            deleteResult.setCount(count.intValue());
          }
          db.command("delete from IfcModel where Id = ?", modelId);
        }
      }
    }
    return deleteResult;
  }

  void exportToJson(List<OResult> results, File file) throws IOException
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

  OrientDB getServer()
  {
    String url = config.getValue(BASE + "url", String.class);
    String username = config.getValue(BASE + "username", String.class);
    String password = config.getValue(BASE + "password", String.class);

    LOGGER.log(Level.INFO, "Connect to {0}@{1}", new Object[]{url, username});

    return new OrientDB(url, username, password, OrientDBConfig.defaultConfig());
  }

  ODatabaseDocument openDB(OrientDB server, String dbName) throws Exception
  {
    String username = config.getValue(BASE + "username", String.class);
    String password = config.getValue(BASE + "password", String.class);

    if (!server.exists(dbName))
      throw new Exception("No database for schema " + dbName);

    ODatabaseSession db = server.open(dbName, username, password);

    db.createClassIfNotExist("IfcModel");

    return db;
  }
}
