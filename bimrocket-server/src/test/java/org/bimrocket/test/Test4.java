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

import org.bimrocket.db.OrientStepLoader;
import com.orientechnologies.orient.core.db.ODatabaseType;
import com.orientechnologies.orient.core.db.OrientDB;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.record.OElement;
import java.io.IOException;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.io.ExpressLoader;

/**
 *
 * @author realor
 */
public class Test4
{

  public static void main(String args[]) throws IOException
  {
    boolean recreate = false;
    String filename = "/home/realor/Documentos/work/IFC/models/OTHERS/AC20-FZK-Haus.ifc";

    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:IFC4x1");

    try (OrientDB orientDB = new OrientDB("remote:localhost", 
        "root", "dankeuve1", OrientDBConfig.defaultConfig())) 
    {
      if (recreate)
      {
        if (orientDB.exists("ifcdb"))
        {
          orientDB.drop("ifcdb");
        }
        orientDB.create("ifcdb", ODatabaseType.PLOCAL);
      }
      try (ODatabaseDocument db = orientDB.open("ifcdb", "root", "dankeuve1")) 
      {
        OrientStepLoader loader = new OrientStepLoader(db, schema);
        OElement model = loader.load(filename);
        model.setProperty("Name", "AC20-FZK-Haus");
        db.save(model);
      }
    }    
  }
}
