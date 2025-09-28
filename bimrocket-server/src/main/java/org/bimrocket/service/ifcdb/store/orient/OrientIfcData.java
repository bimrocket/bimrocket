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

import com.orientechnologies.orient.core.record.OElement;
import com.orientechnologies.orient.core.record.impl.ODocument;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.bimrocket.express.ExpressConstant;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressEnumeration;
import org.bimrocket.express.ExpressPrimitive;
import static org.bimrocket.express.ExpressPrimitive.BOOLEAN_TYPE;
import static org.bimrocket.express.ExpressPrimitive.INTEGER_TYPE;
import static org.bimrocket.express.ExpressPrimitive.LOGICAL_TYPE;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.data.AbstractListData;
import org.bimrocket.express.data.ExpressCursor;
import org.bimrocket.service.ifcdb.store.IfcData;

/**
 *
 * @author realor
 */
public class OrientIfcData extends AbstractListData<OElement> implements IfcData
{
  OrientIfcSetup orientSetup;
  Set<String> forcedRootClasses;
  Set<OElement> rootElements = new HashSet<>();
  OElement ifcProject;

  public OrientIfcData(ExpressSchema schema, OrientIfcSetup orientSetup,
    Set<String> forcedRootClasses)
  {
    super(schema);
    this.orientSetup = orientSetup;
    this.forcedRootClasses = forcedRootClasses;
  }

  public Set<OElement> getRootElements()
  {
    return rootElements;
  }

  public OrientIfcSetup getOrientSetup()
  {
    return orientSetup;
  }

  @Override
  public ExpressCursor getIfcProject()
  {
    if (ifcProject == null) return null;
    return new Cursor(ifcProject){};
  }

  @Override
  protected OElement createEntity(ExpressEntity entity)
  {
    String typeName = entity.getTypeName();
    if (orientSetup.getClass(typeName) == null)
    {
      orientSetup.createClass(entity);
    }
    ODocument oelement = new ODocument(typeName);
    oelement.setTrackingChanges(false);
    rootElements.add(oelement);

    if (typeName.equals("IfcProject"))
    {
      ifcProject = oelement;
    }
    return oelement;
  }

  @Override
  protected OElement createDefinedType(ExpressDefinedType definedType)
  {
    String typeName = definedType.getTypeName();
    if (orientSetup.getClass(typeName) == null)
    {
      orientSetup.createClass(definedType);
    }
    orientSetup.createClassIfNotExists(typeName, "IfcV");
    ODocument oelement = new ODocument(typeName);
    oelement.setTrackingChanges(false);
    return oelement;
  }

  @Override
  protected OElement getElement(Object value)
  {
    if (value instanceof OElement element)
    {
      return element;
    }
    return null;
  }

  @Override
  protected String getElementTypeName(OElement oelement)
  {
    return oelement.getSchemaType().get().getName();
  }

  @Override
  protected String getElementId(OElement oelement)
  {
    return oelement.getIdentity().toString();
  }

  @Override
  protected void setElementValue(OElement oelement, String name, Object value,
    ExpressType type)
  {
    removeFromRoots(value);

    value = toInternalValue(value, type);
    oelement.setProperty(name, value);
  }

  @Override
  protected Object getElementValue(OElement oelement, String name,
    ExpressType type)
  {
    Object value = oelement.getProperty(name);
    return toExternalValue(value, type);
  }

  @Override
  protected void addCollectionValue(List<Object> collection, Object value,
    ExpressType type)
  {
    value = toInternalValue(value, type);

    if (!elements.equals(collection))
    {
      removeFromRoots(value);
    }
    super.addCollectionValue(collection, value, type);
  }

  @Override
  protected void setCollectionValue(List<Object> collection, int index,
    Object value, ExpressType type)
  {
    value = toInternalValue(value, type);

    if (!elements.equals(collection))
    {
      removeFromRoots(value);
    }
    super.setCollectionValue(collection, index, value, type);
  }

  protected Object toExternalValue(Object value, ExpressType type)
  {
    if (BOOLEAN_TYPE.equals(type))
    {
      if (Boolean.TRUE.equals(value)) return ExpressConstant.TRUE;
      if (Boolean.FALSE.equals(value)) return ExpressConstant.FALSE;
      return null;
    }

    if (LOGICAL_TYPE.equals(type))
    {
      if (Boolean.TRUE.equals(value)) return ExpressConstant.TRUE;
      if (Boolean.FALSE.equals(value)) return ExpressConstant.FALSE;
      return ExpressConstant.UNKNOWN;
    }

    if (type instanceof ExpressEnumeration enumeration)
    {
      if (value instanceof String stringValue)
      {
        return enumeration.getValue(stringValue);
      }
    }
    return value;
  }

  protected Object toInternalValue(Object value, ExpressType type)
  {
    if (value instanceof Number number)
    {
      if (INTEGER_TYPE.equals(getPrimitiveType(type)))
      {
        if (value instanceof Integer) return value;
        return number.intValue();
      }
      return number;
    }

    if (ExpressConstant.TRUE.equals(value)) return true;
    if (ExpressConstant.FALSE.equals(value)) return false;
    if (ExpressConstant.UNKNOWN.equals(value)) return null;

    if (value instanceof ExpressConstant constant)
    {
      return constant.toString();
    }
    return value;
  }

  private ExpressPrimitive getPrimitiveType(ExpressType type)
  {
    if (type instanceof ExpressPrimitive primitive)
    {
      return primitive;
    }
    if (type instanceof ExpressDefinedType definedType)
    {
      return definedType.getPrimitive();
    }
    return null;
  }

  private void removeFromRoots(Object item)
  {
    if (item instanceof ODocument oelement)
    {
      if (!forcedRootClasses.contains(oelement.getClassName()))
      {
        rootElements.remove(oelement);
      }
    }
  }
}
