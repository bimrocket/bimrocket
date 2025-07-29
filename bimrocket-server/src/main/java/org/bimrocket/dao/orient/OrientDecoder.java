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

import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.record.OElement;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import static org.bimrocket.dao.orient.OrientDaoStore.MAP_CLASS;
import org.bimrocket.util.EntityDefinition;

/**
 * class to convert an OElement to an Entity object (POJO)
 *
 * @author realor
 */
public class OrientDecoder
{
  private final String packageName;

  public static OrientDecoder create(String packageName)
  {
    return new OrientDecoder(packageName);
  }

  public static OrientDecoder create(Class<?> cls)
  {
    return new OrientDecoder(cls.getPackageName());
  }

  OrientDecoder(String packageName)
  {
    this.packageName = packageName;
  }

  public void copyToEntity(OElement oelement, Object entity)
  {
    EntityDefinition def = EntityDefinition.getInstance(entity.getClass());
    for (Field field : def.getFields())
    {
      try
      {
        String fieldName = field.getName();
        Object propertyValue = oelement.getProperty(fieldName);
        field.set(entity, fromDB(propertyValue));
      }
      catch (Exception ex)
      {
        // ignore
      }
    }
  }

  public Object fromDB(Object object)
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
    else if (object instanceof OElement)
    {
      OElement oelement = (OElement)object;
      OClass oclass = oelement.getSchemaType().orElse(null);
      String className = null;
      if (oclass != null)
      {
        String oclassName = oclass.getName();
        if (!oclassName.equals(MAP_CLASS))
        {
          className = packageName + "." + oclassName;
        }
      }

      if (className == null) // no class or MAP_CLASS
      {
        Map<String, Object> map = new HashMap<>();
        for (String propertyName : oelement.getPropertyNames())
        {
          Object value = oelement.getProperty(propertyName);
          map.put(propertyName, fromDB(value));
        }
        return map;
      }
      else
      {
        Object entity = newEntity(className);
        copyToEntity(oelement, entity);
        return entity;
      }
    }
    else if (object instanceof List)
    {
      List<?> col = (List<?>)object;
      List<Object> list = new ArrayList<>();
      for (Object item : col)
      {
        list.add(fromDB(item));
      }
      return list;
    }
    else if (object instanceof Set)
    {
      Set<?> col = (Set<?>)object;
      Set<Object> set = new HashSet<>();
      for (Object item : col)
      {
        set.add(fromDB(item));
      }
      return set;
    }
    return String.valueOf(object);
  }

  protected Object newEntity(String className)
  {
    try
    {
      return Class.forName(className).getConstructor().newInstance();
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }
}
