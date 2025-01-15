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

import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.sql.executor.OResult;
import com.orientechnologies.orient.core.sql.executor.OResultSet;
import jakarta.persistence.Id;
import java.lang.reflect.Field;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.commons.beanutils.BeanUtils;
import org.bimrocket.dao.Dao;

/**
 *
 * @author realor
 * @param <E> the type managed by this DAO
 */
public class OrientDao<E> implements Dao<E>
{
  private final ODatabaseObject db;
  private final Class<E> cls;
  private static final Map<Class<?>, Field> idFields = new HashMap<>();

  public OrientDao(ODatabaseObject db, Class<E> cls)
  {
    this.db = db;
    this.cls = cls;
  }

  @Override
  public List<E> select(Map<String, Object> filter, Collection<String> orderBy)
  {
    String query = "select * from " + cls.getSimpleName();

    query += addFilter(filter);

    if (orderBy != null) query += addOrderBy(orderBy);

    List<E> list = db.objectQuery(query, filter);
    for (int i = 0; i < list.size(); i++)
    {
      list.set(i, db.detachAll(list.get(i), true));
    }
    return list;
  }

  @Override
  public Object select(String groupExpression, Map<String, Object> filter)
  {
    String query = "select " + groupExpression + " from " + cls.getSimpleName();

    query += addFilter(filter);

    OResultSet resultSet = db.query(query, filter);

    if (resultSet.hasNext())
    {
      OResult result = resultSet.next();
      return result.getProperty(groupExpression);
    }
    return null;
  }

  @Override
  public E select(Object id)
  {
    E dbEntity = internalLoad(id);
    if (dbEntity == null) return null;

    return db.detachAll(dbEntity, true);
  }

  @Override
  public E insert(E entity)
  {
    return db.detachAll(db.save(entity), true);
  }

  @Override
  public E update(E entity)
  {
    try
    {
      Field idField = getIdField(cls);
      Object id = idField.get(entity);

      E dbEntity = internalLoad(id);
      if (dbEntity == null) return null;

      BeanUtils.copyProperties(dbEntity, entity);
      return db.detachAll(db.save(dbEntity), true);
    }
    catch (Exception ex)
    {
      return null;
    }
  }

  @Override
  public boolean delete(Object id)
  {
    Field idField = getIdField(cls);

    String query = "select from " + cls.getSimpleName() +
      " where " + idField.getName() + " = ?";

    OResultSet resultSet = db.command(query, id);

    if (resultSet.hasNext())
    {
      OResult result = resultSet.next();
      removeObject(result.getElement().get());
      return true;
    }
    return false;
  }

  @Override
  public int delete(Map<String, Object> filter)
  {
    String query = "select from " + cls.getSimpleName();

    query += addFilter(filter);

    OResultSet resultSet = db.command(query, filter);

    int count = 0;
    while (resultSet.hasNext())
    {
      OResult result = resultSet.next();
      removeObject(result.getElement().get());
      count++;
    }
    return count;
  }

  private void removeObject(Object object)
  {
    if (object instanceof OElement)
    {
      OElement element = (OElement)object;

      db.delete(element.getIdentity());

      Set<String> propertyNames = element.getPropertyNames();

      for (String propertyName : propertyNames)
      {
        Object property = element.getProperty(propertyName);
        removeObject(property);
      }
    }
  }

  private E internalLoad(Object id)
  {
    Field idField = getIdField(cls);

    String query = "select from " + cls.getSimpleName() +
      " where " + idField.getName() + " = ?";
    List<E> result = db.objectQuery(query, id);
    if (!result.isEmpty())
    {
      return result.get(0);
    }
    return null;
  }

  private String addFilter(Map<String, Object> filter)
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

  private String addOrderBy(Collection<String> orderBy)
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

  private static synchronized Field getIdField(Class<?> cls)
  {
    Field idField = idFields.get(cls);
    if (idField == null)
    {
      Field[] declaredFields = cls.getDeclaredFields();
      for (Field field : declaredFields)
      {
        if (field.isAnnotationPresent(Id.class))
        {
          idField = field;
          idField.setAccessible(true);
          idFields.put(cls, idField);
          break;
        }
      }
      if (idField == null)
        throw new RuntimeException("Not Id field defined for [" +
          cls.getSimpleName() + "]");
    }
    return idField;
  }
}
