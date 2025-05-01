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
package org.bimrocket.dao.orient;

import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.bimrocket.dao.Dao;
import static org.bimrocket.dao.orient.OrientDaoStore.MAP_CLASS;
import org.bimrocket.util.EntityDefinition;

/**
 *
 * @author realor
 * @param <E> the type managed by this DAO
 */
public class OrientDao<E> implements Dao<E>
{
  private final ODatabaseDocument db;
  private final Class<E> cls;
  private final EntityDefinition definition;

  public OrientDao(ODatabaseDocument db, Class<E> cls)
  {
    this.db = db;
    this.cls = cls;
    this.definition = EntityDefinition.getInstance(cls);
  }

  @Override
  public List<E> select(Map<String, Object> filter, Collection<String> orderBy)
  {
    String query = "select * from " + cls.getSimpleName();

    query += addFilter(filter);

    if (orderBy != null) query += addOrderBy(orderBy);

    List<E> list = new ArrayList<>();

    OResultSet rs = db.query(query, filter);
    while (rs.hasNext())
    {
      OResult result = rs.next();
      OElement oelement = result.getElement().orElse(null);
      E entity = newEntity();
      copyToEntity(oelement, entity);
      list.add(entity);
    }
    return list;
  }

  @Override
  public Object select(String groupExpression, Map<String, Object> filter)
  {
    String query = "select " + groupExpression + " from " + cls.getSimpleName();

    query += addFilter(filter);

    OResultSet rs = db.query(query, filter);

    if (rs.hasNext())
    {
      OResult result = rs.next();
      return result.getProperty(groupExpression);
    }
    return null;
  }

  @Override
  public E select(Object id)
  {
    OElement oelement = internalSelect(id);
    if (oelement == null) return null;
    E entity = newEntity();
    copyToEntity(oelement, entity);
    return entity;
  }

  @Override
  public E insert(E entity)
  {
    OElement oelement = db.newElement(cls.getSimpleName());
    copyToElement(entity, oelement);
    db.save(oelement);
    return entity;
  }

  @Override
  public E update(E entity)
  {
    try
    {
      Field idField = definition.getIdentityField(true);
      Object id = idField.get(entity);

      OElement oelement = internalSelect(id);
      if (oelement == null) return null;

      copyToElement(entity, oelement);

      db.save(oelement);
      return entity;
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  @Override
  public E insertOrUpdate(E entity)
  {
    try
    {
      Field idField = definition.getIdentityField(true);
      Object id = idField.get(entity);

      OElement oelement = internalSelect(id);
      if (oelement == null)
      {
        oelement = db.newElement(cls.getSimpleName());
      }

      copyToElement(entity, oelement);

      db.save(oelement);
      return entity;
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  @Override
  public boolean delete(Object id)
  {
    Field idField = definition.getIdentityField(true);

    String query = "select from " + cls.getSimpleName() +
      " where " + idField.getName() + " = ?";

    OResultSet rs = db.query(query, id);

    if (rs.hasNext())
    {
      OResult result = rs.next();
      deleteCascade(result.getElement().get());
      return true;
    }
    return false;
  }

  @Override
  public int delete(Map<String, Object> filter)
  {
    String query = "select from " + cls.getSimpleName();

    query += addFilter(filter);

    OResultSet rs = db.query(query, filter);

    int count = 0;
    while (rs.hasNext())
    {
      OResult result = rs.next();
      deleteCascade(result.getElement().get());
      count++;
    }
    return count;
  }

  protected E newEntity()
  {
    try
    {
      return cls.getConstructor().newInstance();
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
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


  // internal methods

  protected OElement internalSelect(Object id)
  {
    Field idField = definition.getIdentityField(true);

    String query = "select from " + cls.getSimpleName() +
      " where " + idField.getName() + " = ?";
    OResultSet rs = db.query(query, id);
    if (rs.hasNext())
    {
      OResult result = rs.next();
      return result.getElement().orElse(null);
    }
    return null;
  }

  protected String addFilter(Map<String, Object> filter)
  {
    StringBuilder buffer = new StringBuilder();
    int i = 0;
    for (String field : filter.keySet())
    {
      if (i == 0)
      {
        buffer.append(" where ");
      }
      else
      {
        buffer.append(" and ");
      }
      buffer.append(field).append(" = :").append(field);
      i++;
    }
    return buffer.toString();
  }

  protected String addOrderBy(Collection<String> orderBy)
  {
    StringBuilder buffer = new StringBuilder();
    int i = 0;
    for (String field : orderBy)
    {
      if (i == 0)
      {
        buffer.append(" order by ").append(field);
      }
      else
      {
        buffer.append(", ").append(field);
      }
      i++;
    }
    return buffer.toString();
  }

  protected void deleteCascade(Object object)
  {
    if (object instanceof OElement)
    {
      OElement oelement = (OElement)object;

      db.delete(oelement.getIdentity());

      Set<String> propertyNames = oelement.getPropertyNames();

      for (String propertyName : propertyNames)
      {
        Object property = oelement.getProperty(propertyName);
        deleteCascade(property);
      }
    }
  }

  protected void copyToEntity(OElement oelement, Object entity)
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

  protected void copyToElement(Object entity, OElement oelement)
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

  protected Object fromDB(Object object)
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
          // assume object class in same package than Dao cls
          className = cls.getPackageName() + "." + oclassName;
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

  protected Object toDB(Object object)
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
