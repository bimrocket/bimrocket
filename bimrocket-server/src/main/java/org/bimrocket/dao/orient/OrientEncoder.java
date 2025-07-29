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
package org.bimrocket.dao.orient;

import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.record.OElement;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import static org.bimrocket.dao.orient.OrientDaoStore.MAP_CLASS;
import org.bimrocket.util.EntityDefinition;

/**
 * class to convert an Entity object (POJO) to an OElement
 *
 * @author realor
 */
public class OrientEncoder
{
  private final ODatabaseDocument db;

  public static OrientEncoder create(ODatabaseDocument db)
  {
    return new OrientEncoder(db);
  }

  OrientEncoder(ODatabaseDocument db)
  {
    this.db = db;
  }

  public void copyToElement(Object entity, OElement oelement)
  {
    EntityDefinition def = EntityDefinition.getInstance(entity.getClass());
    for (Field field : def.getFields())
    {
      try
      {
        String fieldName = field.getName();
        Object fieldValue = field.get(entity);
        oelement.setProperty(fieldName, toDB(fieldValue));
      }
      catch (Exception ex)
      {
        // ignore
      }
    }
  }

  public Object toDB(Object object)
  {
    if (object == null)
    {
      return null;
    }
    else if (object instanceof Number ||
             object instanceof Boolean ||
             object instanceof String)
    {
      return object;
    }
    else if (object instanceof Map)
    {
      Map<?, ?> map = (Map<?, ?>)object;
      OElement oelement = db.newEmbeddedElement(MAP_CLASS);
      for (Object key : map.keySet())
      {
        String propertyName = key.toString();
        Object value = map.get(propertyName);
        oelement.setProperty(propertyName, toDB(value));
      }
      return oelement;
    }
    else if (object instanceof List)
    {
      List<?> col = (List<?>)object;
      List<Object> list = new ArrayList<>();
      for (Object item : col)
      {
        list.add(toDB(item));
      }
      return list;
    }
    else if (object instanceof Set)
    {
      Set<?> col = (Set<?>)object;
      Set<Object> set = new HashSet<>();
      for (Object item : col)
      {
        set.add(toDB(item));
      }
      return set;
    }
    else // other class
    {
      String className = object.getClass().getSimpleName();
      OElement oelement = db.newElement(className);
      copyToElement(object, oelement);
      return oelement;
    }
  }
}
