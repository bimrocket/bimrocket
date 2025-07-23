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
package org.bimrocket.util;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

/**
 *
 * @author realor
 */
public class EntityDefinition
{
  static final Map<String, EntityDefinition> cache =
    Collections.synchronizedMap(new HashMap<>());

  private final Class<?> entityClass;
  private List<Field> fields;
  private Field identityField;

  public static EntityDefinition getInstance(Class<?> entityClass)
  {
    String className = entityClass.getName();
    EntityDefinition definition = cache.get(className);
    if (definition == null)
    {
      definition = new EntityDefinition(entityClass);
      cache.put(className, definition);
    }
    return definition;
  }

  EntityDefinition(Class<?> entityClass)
  {
    this.entityClass = entityClass;
    build();
  }

  public Class<?> getEntityClass()
  {
    return entityClass;
  }

  public List<Field> getFields()
  {
    return fields;
  }

  public Field getIdentityField()
  {
    return identityField;
  }

  public Field getIdentityField(boolean notNull)
  {
    if (identityField == null && notNull)
      throw new RuntimeException(
        "Entity " + entityClass.getName() + " has no identity");

    return identityField;
  }

  public Map<String, Field> getFieldMap()
  {
    Map<String, Field> map = new ConcurrentHashMap<>();
    for (Field field : fields)
    {
      if (field.getAnnotation(JsonIgnore.class) != null) continue;

      JsonProperty annotation = field.getAnnotation(JsonProperty.class);
      if (annotation == null)
      {
        map.put(field.getName(), field);
      }
      else
      {
        String externalName = annotation.value();
        map.put(externalName, field);
      }
    }
    return map;
  }

  private void build()
  {
    List<Class<?>> classList = new ArrayList<>();
    Class<?> currentClass = entityClass;
    while (currentClass != null && !currentClass.equals(Object.class))
    {
      classList.add(currentClass);
      currentClass = currentClass.getSuperclass();
    }

    fields = new ArrayList<>();
    for (int i = classList.size() - 1; i >= 0; i--)
    {
      Field[] declaredFields = classList.get(i).getDeclaredFields();
      for (Field field : declaredFields)
      {
        int modifiers = field.getModifiers();
        if (Modifier.isStatic(modifiers)) continue;

        if (field.isAnnotationPresent(Id.class) && identityField == null)
        {
          identityField = field;
        }
        field.setAccessible(true);

        fields.add(field);
      }
    }
  }
}
