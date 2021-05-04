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

package org.bimrocket.test;

import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import org.bimrocket.db.OrientStepExporter;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.io.ExpressLoader;

/**
 *
 * @author realor
 */
public class Test5
{

  public static void main(String args[]) throws IOException
  {
    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:IFC4x1");
    
    try (OrientDB orientDB = new OrientDB("remote:localhost", 
         OrientDBConfig.defaultConfig())) 
    {
      OrientStepExporter exporter = new OrientStepExporter(schema);
      
      ODatabaseDocument db = orientDB.open("ifcdb", "root", "dankeuve1");
      ArrayList<OElement> elements = new ArrayList<>();
      try
      {
        //OResultSet query = db.query("select expand(Roots) from IfcFile");
        //OResultSet query = db.query("select expand(Roots) from IfcFile where Name = 'AC20-FZK-Haus'");
        //OResultSet query = db.query("select * from IfcWindow where @rid in (select Roots from IfcFile where Name = 'ROS_ARC')");
//        OResultSet query = db.query("select from (\n" +
//          "select expand($a)" +
//          "let $a =" +
//          "  unionall\n" +
//          "  (" +
//          "    (select from IfcSite)," +
//          "    (select from IfcBuilding)," +
//          "    (select from IfcBuildingStorey)," +
//          "    (select from IfcSpace)" +
//          "  )" +
//          ")" +
//          "where @rid in (select Roots from IfcFile where Name = 'ROS_ARC')");

        OResultSet query = db.query("select from (\n" +
          "select expand(unionall" +
          "  (" +
          "    (select from IfcSite), " +
          "    (select from IfcBuilding)," +
          "    (select from IfcBuildingStorey)," +
          "    (select from IfcSpace)," +
          "    (select from IfcWall)," +
          "    (select from IfcWallStandardCase)," +
          "    (select from IfcRelAggregates)," +
          "    (select from IfcRelContainedInSpatialStructure)" +
          "  ))" +
          ")" +
          "where @rid in (select Roots from IfcFile where Name = 'ROS_ARC')");
        
        while (query.hasNext())
        {
          OResult row = query.next();
          OElement element = row.getElement().get();
          elements.add(element);
        }
        exporter.export(new OutputStreamWriter(
          new FileOutputStream("/home/realor/test.ifc")), elements);
      }
      finally
      {
        db.close();
      }
    }    
  }
}
