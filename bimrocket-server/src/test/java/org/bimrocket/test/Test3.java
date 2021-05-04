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
import com.orientechnologies.orient.core.record.impl.ODocument;
import static java.util.Arrays.asList;

/**
 *
 * @author realor
 */
public class Test3
{
  public static void main(String[] args)
  {
    try
    (OrientDB orientDB = 
      new OrientDB("remote:localhost", OrientDBConfig.defaultConfig()); 
      ODatabaseDocument db = orientDB.open("ifcdb","root", "dankeuve1"))
    {
//      ODocument doc = new ODocument("IfcWall");
//      doc.field("name", "Wall3");
//      doc.field("globalId", "2341235345124");
//      doc.field("indices", asList(asList(1, 2, 3), asList(4, 5, 6), 89, 73));
//      ODocument doc2 = new ODocument("IfcRepresentation");
//      doc2.field("name", "Body");
//      ODocument doc3 = new ODocument("IfcRepresentation");
//      doc2.field("name", "Axis");
//      doc.field("representations", asList(doc2, doc3));      
//      doc.field("city",
//        new ODocument("City")
//          .field("name","Rome")
//          .field("country", "Italy"));
//      db.save(doc);

      
      
      ODocument placement = new ODocument("IfcLocalPlacement");
      placement.field("x", 3.4);
      placement.field("y", 9.7);
      
      ODocument doc1 = new ODocument("IfcWall");
      doc1.field("name", "wall-1");
      doc1.field("globalId", "989796");
      doc1.field("placement", placement);
      
      ODocument doc2 = new ODocument("IfcWall");
      doc2.field("name", "wall-2");
      doc2.field("globalId", "234235");
      doc2.field("placement", placement);
      
      db.save(doc1);
      db.save(doc2);
    }
  }
}
