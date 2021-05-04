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

import com.orientechnologies.orient.core.db.ODatabaseSession;
import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.metadata.schema.OType;
import com.orientechnologies.orient.core.record.OVertex;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import static java.util.Arrays.asList;
import java.util.UUID;

/**
 *
 * @author realor
 */
public class Test
{
  public static void main(String[] args)
  {
    try
    (OrientDB orient = 
      new OrientDB("remote:localhost", OrientDBConfig.defaultConfig()); 
      ODatabaseSession db = orient.open("demodb", "admin", "dankeuve1")) 
    {
      OClass placementClass = db.getClass("IfcPlacement");
      if (placementClass == null)
      {
        placementClass = db.createVertexClass("IfcPlacement");
        placementClass.createProperty("x", OType.DOUBLE);
        placementClass.createProperty("y", OType.DOUBLE);
        placementClass.createProperty("z", OType.DOUBLE);
      }

      OClass rootClass = db.getClass("IfcRoot");
      if (rootClass == null)
      {
        rootClass = db.createVertexClass("IfcRoot");
        rootClass.createProperty("GlobalId", OType.STRING);
        rootClass.createProperty("Name", OType.STRING);
        rootClass.createProperty("Description", OType.STRING);
        rootClass.createProperty("Placements", OType.EMBEDDEDLIST, placementClass, true);
        rootClass.createProperty("Parent", OType.LINK, rootClass, true);
      }

      OVertex placement = db.newVertex(placementClass);
      placement.setProperty("x", 34.5476);
      placement.setProperty("y", 1.45413);
      placement.setProperty("z", 0.0193);
      
      OVertex vertex = db.newVertex(rootClass);
      vertex.setProperty("GlobalId", UUID.randomUUID().toString());
      vertex.setProperty("Name", "Wall exterior");
      vertex.setProperty("Description", "Wall exterior test");
      vertex.setProperty("Placements", asList(placement));
      vertex.save();

      OVertex vertex2 = db.newVertex(rootClass);
      vertex2.setProperty("GlobalId", UUID.randomUUID().toString());
      vertex2.setProperty("Name", "Wall exterior 3");
      vertex2.setProperty("Description", "Wall exterior test 4");
      vertex2.setProperty("Placements", asList(placement, placement));
      vertex2.setProperty("Parent", vertex);
      vertex2.save();
      try (OResultSet result = db.query("select * from IfcRoot where Parent is not null"))
      {
        while (result.hasNext())
        {
          OResult item = result.next();
          OVertex v = item.getVertex().get();
          Object value = v.getProperty("Parent");
          System.out.println(v.toJSON());
          System.out.println(value);
          System.out.println();
        }
      }
    }
  }
}
