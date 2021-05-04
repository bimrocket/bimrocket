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

package org.bimrocket.db;

//import com.orientechnologies.orient.object.db.OObjectDatabaseTx;
//import java.util.Set;
//import org.bimrocket.schema.IFC4x1.IfcBaseEntity;
//import org.bimrocket.schema.IFC4x1.IfcBaseType;
//import org.reflections.Reflections;
//
///**
// *
// * @author realor
// */
//public class DBSchemaCreator
//{
//  public void createSchema(String connection, String pkg, 
//    String user, String password)
//  {
//    try (OObjectDatabaseTx db = 
//      new OObjectDatabaseTx(connection).open(user, password)) 
//    {
//      Reflections reflections = new Reflections(pkg);
//
//      Set<Class<? extends IfcBaseType>> typeClasses = 
//        reflections.getSubTypesOf(IfcBaseType.class);      
//      
//      int i = 0;
//      for (Class cls: typeClasses)
//      {
//        i++;
//        System.out.println("TYPE " + cls.getSimpleName() + 
//          " (" + i + "/" + typeClasses.size() + ")");
//        db.getMetadata().getSchema().generateSchema(cls);
//      }      
//      
//      Set<Class<? extends IfcBaseEntity>> entityClasses = 
//        reflections.getSubTypesOf(IfcBaseEntity.class);      
//      i = 0;
//      for (Class cls: entityClasses)
//      {
//        i++;
//        System.out.println("ENTITY " + cls.getSimpleName() + 
//          " (" + i + "/" + entityClasses.size() + ")");
//        db.getMetadata().getSchema().generateSchema(cls);
//      }
//    }
//  }
//  
//  public static void main(String[] args)
//  {
//    DBSchemaCreator schemaCreator = new DBSchemaCreator();
//    schemaCreator.createSchema("remote:localhost/ifcdb", 
//      "org.ifcserver.schema.IFC4x1", "root", "dankeuve1");
//  }
//}
