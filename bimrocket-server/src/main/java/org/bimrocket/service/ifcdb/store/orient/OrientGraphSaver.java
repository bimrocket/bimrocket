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
package org.bimrocket.service.ifcdb.store.orient;

import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.record.OElement;
import java.util.Collection;
import java.util.Set;

/**
 *
 * @author realor
 */
public class OrientGraphSaver
{
  final ODatabaseDocument db;
  int count;
  int totalCount;

  public OrientGraphSaver(ODatabaseDocument db)
  {
    this.db = db;
  }

  public int save(OElement oelement)
  {
    count = 0;
    saveElement(oelement);
    return count;
  }

  public int getTotalCount()
  {
    return totalCount;
  }

  public void reset()
  {
    totalCount = 0;
  }

  void saveElement(OElement oelement)
  {
    if (!oelement.getIdentity().isValid())
    {
      Set<String> propertyNames = oelement.getPropertyNames();
      for (String propertyName : propertyNames)
      {
        Object object = oelement.getProperty(propertyName);
        if (object instanceof OElement osubElement)
        {
          saveElement(osubElement);
        }
        else if (object instanceof Collection<?> col)
        {
          saveCollection(col);
        }
      }
      db.save(oelement);
      count++;
      totalCount++;
    }
  }

  void saveCollection(Collection<?> col)
  {
    for (Object item : col)
    {
      if (item instanceof OElement osubElement)
      {
        saveElement(osubElement);
      }
      else if (item instanceof Collection<?> subCol)
      {
        saveCollection(subCol);
      }
    }
  }
}
