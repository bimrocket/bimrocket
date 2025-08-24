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

import java.util.ArrayList;
import com.orientechnologies.orient.core.record.impl.ODocument;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.bimrocket.express.*;
import org.bimrocket.service.ifcdb.store.orient.OrientStepLoader.OrientElements;
import org.bimrocket.step.io.DefinedTypeStepBuilder;
import org.bimrocket.step.io.EntityStepBuilder;
import org.bimrocket.step.io.ListBuilder;
import org.bimrocket.step.io.StepBuilder;
import org.bimrocket.step.io.StepLoader;

/**
 *
 * @author realor
 */
public class OrientStepLoader extends StepLoader<OrientElements>
{
  OrientIfcSetup orientSetup;
  Set<String> forcedRootClasses;

  public OrientStepLoader(ExpressSchema schema, OrientIfcSetup orientSetup)
  {
    this(schema, orientSetup, Collections.emptySet());
  }

  public OrientStepLoader(ExpressSchema schema, OrientIfcSetup orientSetup,
    Set<String> forcedRootClasses)
  {
    super(schema);
    this.orientSetup = orientSetup;
    this.forcedRootClasses = forcedRootClasses;
  }

  @Override
  public StepBuilder<? extends Object> createBuilder(ExpressType type,
    ExpressType expectedType)
  {
    if (type instanceof ExpressEntity entity)
    {
      return new OElementBuilder(entity);
    }
    else if (type instanceof ExpressDefinedType definedType)
    {
      if (expectedType instanceof ExpressDefinedType expectedDefinedType)
      {
        if (expectedDefinedType.getPrimitive() != null)
        {
          // Do not save an ODocument when it is no necessary.
          // Use a PrimitiveBuilder instead to save the primitive value directly
          return new PrimitiveBuilder(definedType);
        }
      }
      // Create an OElement for other cases (like IfcPropertySingleValue)
      return new SimpleOElementBuilder(definedType);
    }
    else if (type instanceof ExpressCollection collection)
    {
      return new OCollectionBuilder(collection, new ArrayList<>());
    }
    return null;
  }

  @Override
  protected OrientElements createModel()
  {
    return new OrientElements();
  }

  public class OrientElements
  {
    ODocument project;
    Set<ODocument> rootElements = new HashSet<>();

    public ODocument getProject()
    {
      return project;
    }

    public Set<ODocument> getRootElements()
    {
      return rootElements;
    }
  }

  class OElementBuilder extends EntityStepBuilder<ODocument>
  {
    OElementBuilder(ExpressEntity type)
    {
      orientSetup.createClass(type);

      this.type = type;
      this.instance = new ODocument(type.getName());
      this.instance.setTrackingChanges(false);
      model.rootElements.add(instance);
      if (type.getName().equals("IfcProject"))
      {
        model.project = instance;
      }
    }

    @Override
    public void set(int index, Object item)
    {
      removeFromRoots(item);

      List<ExpressAttribute> attributes = type.getAllAttributes();
      if (index < attributes.size())
      {
        ExpressAttribute attribute = attributes.get(index);
        item = convertValue(item, attribute.getType());
        set(attribute.getName(), item);
      }
    }

    @Override
    public void set(String attributeName, Object item)
    {
      if (attributeName == null) return;

      instance.setProperty(attributeName, item);
    }
  }

  class SimpleOElementBuilder extends DefinedTypeStepBuilder<ODocument>
  {
    SimpleOElementBuilder(ExpressDefinedType definedType)
    {
      orientSetup.createClass(definedType);

      this.type = definedType;
      this.instance = new ODocument(definedType.getName());
      this.instance.setTrackingChanges(false);
    }

    @Override
    public void set(int index, Object item)
    {
      removeFromRoots(item);

      item = convertValue(item, type.getPrimitive());
      instance.setProperty("value", item);
    }
  }

  class PrimitiveBuilder extends DefinedTypeStepBuilder<Object>
  {
    PrimitiveBuilder(ExpressDefinedType definedType)
    {
      this.type = definedType;
    }

    @Override
    public void set(int index, Object item)
    {
      instance = convertValue(item, type.getPrimitive());
    }
  }

  class OCollectionBuilder extends ListBuilder
  {
    public OCollectionBuilder(ExpressCollection type, List<Object> list)
    {
      super(type, list);
    }

    @Override
    public int add(Object item)
    {
      removeFromRoots(item);

      item = convertValue(item, type.getElementType());
      instance.add(item);
      return instance.size() - 1;
    }

    @Override
    public void set(int index, Object item)
    {
      removeFromRoots(item);

      item = convertValue(item, type.getElementType());
      instance.set(index, item);
    }
  }

  protected Object convertValue(Object value, ExpressType attributeType)
  {
    if (attributeType instanceof ExpressDefinedType definedType)
    {
      attributeType = definedType.getPrimitive();
    }

    if (attributeType instanceof ExpressPrimitive primitive)
    {
      if (primitive.isInteger()) // convert to Integer
      {
        if (value instanceof Number number)
        {
          value = number.intValue();
        }
      }
      else if (primitive.isReal() || primitive.isNumber()) // convert to Double
      {
        if (value instanceof Number number)
        {
          value = number.doubleValue();
        }
      }
      else if (primitive.isBoolean())
      {
        if (".T.".equals(value))
        {
          value = true;
        }
        else if (".F.".equals(value))
        {
          value = false;
        }
      }
    }
    return value;
  }

  private void removeFromRoots(Object item)
  {
    if (item instanceof ODocument oelement)
    {
      if (!forcedRootClasses.contains(oelement.getClassName()))
      {
        model.rootElements.remove(oelement);
      }
    }
  }
}
