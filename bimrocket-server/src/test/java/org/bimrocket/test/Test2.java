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

//import com.orientechnologies.orient.core.record.ORecord;
//import com.orientechnologies.orient.core.sql.executor.OResult;
//import com.orientechnologies.orient.core.sql.executor.OResultSet;
//import com.orientechnologies.orient.core.sql.query.OSQLSynchQuery;
//import com.orientechnologies.orient.object.db.OObjectDatabaseTx;
//import java.util.List;
//import java.util.UUID;
//import org.bimrocket.schema.IFC4x1.IfcRoot;
//
///**
// *
// * @author realor
// */
//public class Test2
//{
//  public static void main(String[] args)
//  {
//    try (OObjectDatabaseTx db = 
//      new OObjectDatabaseTx("remote:localhost/ifcdb").open("admin", "dankeuve1")) 
//    {
//      db.getEntityManager().registerEntityClass(IfcRoot.class);
//
//      IfcRoot root = db.newInstance(IfcRoot.class);
//      
//      /*
//      IfcPlacement p = db.newInstance(IfcPlacement.class);
//      p.setX(31.8);
//      p.setY(4.2);
//      p.setZ(0.5);
//      IfcWall wall = db.newInstance(IfcWall.class);
//      wall.setGlobalId(UUID.randomUUID().toString());
//      wall.setName("Simple wall 2");
//      wall.setDescription("wall description 2");
//      wall.setHeight(3.5);
//      wall.setPlacements(asList(p));
//      db.save(wall);
//      wall = db.newInstance(IfcWall.class);
//      wall.setGlobalId(UUID.randomUUID().toString());
//      wall.setName("Simple wall 3");
//      wall.setDescription("wall description 3");
//      wall.setHeight(3.2);
//      wall.setPlacements(asList(p));
//      db.save(wall);
//       */
//      
//      List<IfcRoot> result = db.query(new OSQLSynchQuery<IfcRoot>("select * from IfcRoot"));
//      for (IfcRoot r : result)
//      {
//        System.out.println(r);
//      }
//    }
//  }
//}
