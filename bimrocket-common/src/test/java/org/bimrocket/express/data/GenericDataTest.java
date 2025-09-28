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
package org.bimrocket.express.data;

import java.io.IOException;
import static org.bimrocket.express.ExpressCollection.LIST;
import static org.bimrocket.express.ExpressConstant.C;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.io.ExpressLoader;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import org.junit.jupiter.api.Test;

/**
 *
 * @author realor
 */
public class GenericDataTest
{
  public GenericData createGenericData() throws IOException
  {
    ExpressLoader schemaLoader = new ExpressLoader();
    ExpressSchema schema = schemaLoader.load("schema:IFC4");

    GenericData data = new GenericData(schema);
    ExpressCursor cursor = data.getRoot();

    cursor
      .create("IfcProject")
        .set("GlobalId", "798739845345")
        .set("Name", "Projecte")
        .create("Phase", "IfcLabel")
          .set(0, "Test")
        .exit()
      .exit()

      .create("IfcWall").exit()
      .create("IfcWindow").exit()

      .create("IfcWall")
        .set("GlobalId", "1111232524")
        .set("Name", "Paret")
        .create("OwnerHistory", "IfcOwnerHistory")
          .set("State", C("READWRITE"))
          .create("OwningApplication", "IfcApplication")
            .set("ApplicationFullName", "BIMROCKET")
          .exit()
        .exit()
      .exit()

      .create("IfcTriangulatedFaceSet")
        .create("CoordIndex", LIST)
          .create(LIST)
            .add(1)
            .add(2)
            .add(43)
          .exit()
          .create(LIST)
            .add(4)
            .add(5)
            .add(6)
          .exit()
        .exit()
      .exit();

    return data;
  }

  @Test
  public void genericDataCreation()
  {
    assertDoesNotThrow(() -> createGenericData());
  }

  public static void main(String[] args)
  {
    try
    {
      GenericDataTest test = new GenericDataTest();
      var data = test.createGenericData();
      System.out.println(data.elements);
    }
    catch (Exception ex)
    {
      ex.printStackTrace();
    }
  }
}
