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
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.metadata.schema.OProperty;
import com.orientechnologies.orient.core.metadata.schema.OSchema;
import com.orientechnologies.orient.core.metadata.schema.OType;
import java.util.List;
import java.util.logging.Level;
import org.bimrocket.dao.orient.OrientSetup;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressEnumeration;
import org.bimrocket.express.ExpressPrimitive;
import org.bimrocket.express.ExpressType;

/**
 *
 * @author realor
 */
public class OrientIfcSetup extends OrientSetup
{
  public OrientIfcSetup(ODatabaseDocument db)
  {
    super(db);
  }

  public OClass createClass(ExpressDefinedType definedType)
  {
    String typeName = definedType.getName();
    OSchema oschema = getSchema();
    OClass oclass = oschema.getClass(definedType.getName());
    if (oclass == null)
    {
      LOGGER.log(Level.INFO, "Creating class {0}", typeName);

      oclass = oschema.createClass(typeName, oschema.getClass("IfcV"));
      ExpressPrimitive primitive = definedType.getPrimitive();
      if (primitive == null)
      {
        oclass.createProperty("value", OType.ANY);
      }
      else
      {
        oclass.createProperty("value", getBasicType(primitive));
      }
    }
    return oclass;
  }

  public OClass createClass(ExpressEntity entity)
  {
    String entityName = entity.getName();

    OSchema oschema = getSchema();
    OClass oclass = oschema.getClass(entityName);
    if (oclass != null) return oclass;

    OClass osuperClass = null;
    ExpressEntity superEntity = entity.getSuperEntity();
    if (superEntity != null)
    {
      osuperClass = createClass(superEntity);
    }

    LOGGER.log(Level.INFO, "Creating class {0}", entityName);

    oclass = oschema.createClass(entityName);
    oclass.setAbstract(entity.isAbstract());

    if (osuperClass == null)
    {
      oclass.setSuperClasses(List.of(oschema.getClass("IfcV")));
    }
    else
    {
      oclass.setSuperClasses(List.of(osuperClass));
    }

    for (ExpressAttribute attribute : entity.getAttributes())
    {
      String propertyName = attribute.getName();
      ExpressType attributeType = attribute.getType();

      OProperty property = null;

      if (attributeType instanceof ExpressPrimitive primitive)
      {
        OType otype = getBasicType(primitive);
        property = oclass.createProperty(propertyName, otype);
      }
      else if (attributeType instanceof ExpressDefinedType definedType)
      {
        ExpressType rootType = definedType.getRootType();
        if (rootType instanceof ExpressPrimitive primitive)
        {
          OType otype = getBasicType(primitive);
          property = oclass.createProperty(propertyName, otype);
        }
      }
      else if (attributeType instanceof ExpressEntity subEntity)
      {
        OClass osubClass = createClass(subEntity);
        property = oclass.createProperty(propertyName, OType.LINK, osubClass);
      }
      else if (attributeType instanceof ExpressEnumeration)
      {
        property = oclass.createProperty(propertyName, OType.STRING);
      }
      else if (attributeType instanceof ExpressCollection collection)
      {
        ExpressType elementType = collection.getElementType();
        if (elementType instanceof ExpressPrimitive primitive)
        {
          OType otype = getBasicType(primitive);
          property = oclass.createProperty(propertyName, OType.EMBEDDEDLIST, otype);
        }
        else if (elementType instanceof ExpressDefinedType definedType)
        {
          ExpressType rootType = definedType.getRootType();
          if (rootType instanceof ExpressPrimitive primitive)
          {
            OType otype = getBasicType(primitive);
            property = oclass.createProperty(propertyName, OType.EMBEDDEDLIST, otype);
          }
        }
        else if (elementType instanceof ExpressEntity subEntity)
        {
          OClass osubClass = createClass(subEntity);
          property = oclass.createProperty(propertyName, OType.LINKLIST, osubClass);
        }
      }

      if (property == null)
      {
        property = oclass.createProperty(propertyName, OType.ANY);
      }
      property.setMandatory(!attribute.isOptional());
    }
    return oclass;
  }

  protected OType getBasicType(ExpressPrimitive primitive)
  {
    switch (primitive.getName())
    {
      case ExpressPrimitive.STRING: return OType.STRING; // java.lang.String
      case ExpressPrimitive.INTEGER: return OType.INTEGER; // java.lang.Integer
      case ExpressPrimitive.REAL: return OType.DOUBLE; // java.lang.Double
      case ExpressPrimitive.NUMBER: return OType.DOUBLE; // java.lang.Double
      case ExpressPrimitive.BOOLEAN: return OType.BOOLEAN; // java.lang.Boolean (true or false)
      case ExpressPrimitive.LOGICAL: return OType.STRING; // java.lang.String (.T., .F., .U.)
      case ExpressPrimitive.BINARY: return OType.BINARY; // java.lang.byte[]
    }
    return OType.ANY;
  }
}
