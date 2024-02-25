/*
 * BIMROCKET
 *
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.service.ifc;

import com.orientechnologies.orient.core.db.ODatabaseType;
import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import jakarta.inject.Inject;
import jakarta.servlet.ServletContext;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import org.bimrocket.db.OrientStepExporter;
import org.bimrocket.db.OrientStepLoader;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.io.ExpressLoader;
import org.jvnet.hk2.annotations.Service;

/**
 *
 * @author realor
 */
@Service
public class IfcService
{
  public static final String IFC_DB_URL = "ifc.db.url";
  public static final String IFC_DB_USERNAME = "ifc.db.username";
  public static final String IFC_DB_PASSWORD = "ifc.db.password";

  @Inject
  ServletContext servletContext;

  public void getIfcFileById(String schemaName, String fileId, File ifcFile)
    throws Exception
  {
    String query = "select expand(Roots) from IfcFile where Id = '" + fileId + "'";
    getIfcFileByQuery(schemaName, query, ifcFile);
  }

  public void getIfcFileByQuery(String schemaName, String query, File ifcFile)
    throws Exception
  {
    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:" + schemaName);

    String dbName = schemaName;
    String url = servletContext.getInitParameter(IFC_DB_URL);
    String username = servletContext.getInitParameter(IFC_DB_USERNAME);
    String password = servletContext.getInitParameter(IFC_DB_PASSWORD);

    try (OrientDB orientDB = new OrientDB(url, username, password,
         OrientDBConfig.defaultConfig()))
    {
      if (!orientDB.exists(dbName))
        throw new Exception("No database for schema " + schemaName);

      OrientStepExporter exporter = new OrientStepExporter(schema);

      ODatabaseDocument db = orientDB.open(dbName, username, password);
      ArrayList<OElement> elements = new ArrayList<>();
      try
      {
        OResultSet rs = db.query(query);

        while (rs.hasNext())
        {
          OResult row = rs.next();
          OElement element = row.getElement().get();
          elements.add(element);
        }
        exporter.export(new OutputStreamWriter(
          new FileOutputStream(ifcFile)), elements);
      }
      finally
      {
        db.close();
      }
    }
  }

  public void putIfcFile(String schemaName, String fileId, File ifcFile)
    throws Exception
  {
    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:" + schemaName);

    String dbName = schemaName;
    String url = servletContext.getInitParameter(IFC_DB_URL);
    String username = servletContext.getInitParameter(IFC_DB_USERNAME);
    String password = servletContext.getInitParameter(IFC_DB_PASSWORD);

    try (OrientDB orientDB = new OrientDB(url, username, password,
         OrientDBConfig.defaultConfig()))
    {
      if (!orientDB.exists(dbName))
      {
        orientDB.create(dbName, ODatabaseType.PLOCAL);
      }

      try (ODatabaseDocument db = orientDB.open(dbName, username, password))
      {
        OrientStepLoader loader = new OrientStepLoader(db, schema);
        OElement model = loader.load(ifcFile);
        model.setProperty("Id", fileId);
        db.save(model);
      }
    }
  }
}
