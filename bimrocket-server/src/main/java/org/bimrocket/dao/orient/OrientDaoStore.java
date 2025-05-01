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
import com.orientechnologies.orient.core.index.OIndex;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.metadata.schema.OClass.INDEX_TYPE;
import com.orientechnologies.orient.core.metadata.schema.OProperty;
import com.orientechnologies.orient.core.metadata.schema.OSchema;
import com.orientechnologies.orient.core.metadata.schema.OType;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.dao.DaoStore;
import jakarta.inject.Inject;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

public abstract class OrientDaoStore<C extends DaoConnection>
  implements DaoStore<C>
{
  static final protected Logger LOGGER =
    Logger.getLogger(OrientDaoStore.class.getName());

  public static final String MAP_CLASS = "Map";

  private String dbAlias;
  private boolean initialized;

  @Inject
  OrientPoolManager poolManager;

  public OrientDaoStore()
  {
  }

  public OrientDaoStore(OrientPoolManager poolManager)
  {
    this.poolManager = poolManager;
  }

  public String getDbAlias()
  {
    return dbAlias;
  }

  public void setDbAlias(String dbAlias)
  {
    this.dbAlias = dbAlias;
  }

  protected ODatabaseDocument getOrientConnection()
  {
    ODatabaseDocument db = poolManager.getDocumentConnection(dbAlias);

    synchronized (this)
    {
      if (!initialized)
      {
        OSchema schema = db.getMetadata().getSchema();
        if (!schema.existsClass(MAP_CLASS))
        {
          schema.createClass(MAP_CLASS);
        }
        registerEntityClasses(schema);
        initialized = true;
      }
    }
    return db;
  }


  @Override
  public void close()
  {
    // pool is closed by OrientPoolManager
  }

  protected void registerEntityClasses(OSchema schema)
  {
  }

  protected OClass registerEntityClass(OSchema schema, Class<?> cls)
  {
    OClass oclass;
    String className = cls.getSimpleName();
    if (schema.existsClass(className))
    {
      oclass = schema.getClass(className);
    }
    else
    {
      if (Modifier.isAbstract(cls.getModifiers()))
      {
        oclass = schema.createAbstractClass(className);
      }
      else
      {
        oclass = schema.createClass(className);
      }

      Class<?> superClass = cls.getSuperclass();
      if (superClass != null && !superClass.equals(Object.class))
      {
        OClass osuperClass = registerEntityClass(schema, superClass);
        oclass.setSuperClasses(List.of(osuperClass));
      }

      for (Field field : cls.getDeclaredFields())
      {
        int modifiers = field.getModifiers();
        if (Modifier.isStatic(modifiers)) continue;

        String fieldName = field.getName();
        Class<?> fieldClass = field.getType();

        if (Collection.class.isAssignableFrom(fieldClass))
        {
          createCollectionProperty(schema, oclass, field);
        }
        else if (Map.class.isAssignableFrom(fieldClass))
        {
          oclass.createProperty(fieldName, OType.EMBEDDEDMAP);
        }
        else
        {
          OType otype = getBasicType(fieldClass);
          if (otype != null)
          {
            oclass.createProperty(fieldName, otype);
          }
          else
          {
            OClass oclassField = registerEntityClass(schema, fieldClass);
            oclass.createProperty(fieldName, OType.LINK, oclassField);
          }
        }
      }
      log(oclass);
    }
    return oclass;
  }

  protected OIndex createIndex(OClass oclass, String indexName,
    INDEX_TYPE itype, String... fields)
  {
    Set<OIndex> indexes = oclass.getInvolvedIndexes(fields);
    boolean exists = indexes.stream()
      .anyMatch(index-> index.getName().equals(indexName));

    if (exists)
    {
      return indexes.iterator().next();
    }
    else
    {
      LOGGER.log(Level.INFO, "Creating index {0} on {1}{2}",
        new Object[]{indexName, oclass.getName(), List.of(fields)});
      return oclass.createIndex(indexName, itype, fields);
    }
  }

  protected void createCollectionProperty(OSchema schema, OClass oclass, Field field)
  {
    OType otypeArg = null;
    OClass oclassArg = null;
    Class<?> classArg = null;

    Type type = field.getGenericType();
    if (type instanceof ParameterizedType ptype)
    {
      Type[] typeArgs = ptype.getActualTypeArguments();
      String typeName = typeArgs[0].getTypeName();

      try
      {
        classArg = Class.forName(typeName);
      }
      catch (Exception ex)
      {
        throw new RuntimeException(ex);
      }
      otypeArg = getBasicType(classArg);
      if (otypeArg == null)
      {
        oclassArg = registerEntityClass(schema, classArg);
      }

      if (List.class.isAssignableFrom(field.getType()))
      {
        if (otypeArg != null)
        {
          oclass.createProperty(field.getName(), OType.EMBEDDEDLIST, otypeArg);
        }
        else if (oclassArg != null)
        {
          oclass.createProperty(field.getName(), OType.LINKLIST, oclassArg);
        }
      }
      else if (Set.class.isAssignableFrom(field.getType()))
      {
        if (otypeArg != null)
        {
          oclass.createProperty(field.getName(), OType.EMBEDDEDSET, otypeArg);
        }
        else if (oclassArg != null)
        {
          oclass.createProperty(field.getName(), OType.LINKSET, oclassArg);
        }
      }
    }
  }

  protected OType getBasicType(Class<?> fieldClass)
  {
    if (String.class.equals(fieldClass))
    {
      return OType.STRING;
    }
    else if (Boolean.class.equals(fieldClass) ||
             boolean.class.equals(fieldClass))
    {
      return OType.BOOLEAN;
    }
    else if (Short.class.equals(fieldClass) ||
             short.class.equals(fieldClass))
    {
      return OType.SHORT;
    }
    else if (Integer.class.equals(fieldClass) ||
             int.class.equals(fieldClass))
    {
      return OType.INTEGER;
    }
    else if (Long.class.equals(fieldClass) ||
             long.class.equals(fieldClass))
    {
      return OType.LONG;
    }
    else if (Float.class.equals(fieldClass) ||
             float.class.equals(fieldClass))
    {
      return OType.FLOAT;
    }
    else if (Double.class.equals(fieldClass) ||
             double.class.equals(fieldClass))
    {
      return OType.DOUBLE;
    }
    else if (Number.class.isAssignableFrom(fieldClass))
    {
      return OType.DECIMAL;
    }
    else if (Object.class.equals(fieldClass))
    {
      return OType.ANY;
    }
    return null;
  }

  protected void log(OClass oclass)
  {
    if (!LOGGER.isLoggable(Level.INFO)) return;

    String classDef = oclass.isAbstract() ? "abstract " : "";
    classDef += "class " + oclass.getName();

    if (!oclass.getSuperClasses().isEmpty())
    {
      classDef += " extends " + oclass.getSuperClasses().get(0);
    }

    LOGGER.log(Level.INFO, "Creating {0}", classDef);
    Collection<OProperty> properties = oclass.properties();
    for (OProperty property : properties)
    {
      String propDef = oclass.getName() + "." +
        property.getName() + ": " + property.getType();

      OType linkedType = property.getLinkedType();
      OClass linkedClass = property.getLinkedClass();

      if (linkedType != null) propDef += " " + linkedType;
      else if (linkedClass != null) propDef += " " + linkedClass;

      LOGGER.log(Level.INFO, propDef);
    }
  }
}
