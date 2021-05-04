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

package org.bimrocket.step.io;

/**
 *
 * @author realor
 */

import java.io.PrintWriter;
import java.io.Writer;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressEnumeration;
import org.bimrocket.express.ExpressNamedType;
import org.bimrocket.express.ExpressPrimitive;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import static org.bimrocket.express.ExpressPrimitive.INTEGER;

/**
 *
 * @author realor
 */
public abstract class StepExporter
{
  protected ExpressSchema schema;
  protected Map<Object, Integer> entityMap = new HashMap<>();
  protected List<Object> entityList = new ArrayList<>();
  protected int tagCount;

  public StepExporter(ExpressSchema schema)
  {
    this.schema = schema;
  }

  public void export(Writer writer, List objects)
  {
    tagCount = 0;
    entityMap.clear();
    for (Object object : objects)
    {
      ExpressEntity entityType = getEntityType(object);
      if (entityType != null)
      {
        if ("IfcRoot".equals(entityType.getRootEntity().getName()))
        {
          registerObject(object);
        }
      }
    }

    try (PrintWriter printer = new PrintWriter(writer))
    {
      printHeader(printer);
      printData(printer);
      printFooter(printer);
    }
  }

  protected void printHeader(PrintWriter printer)
  {
    printer.println("ISO-10303-21;");
    printer.println("HEADER;");
    printer.println("FILE_DESCRIPTION(('step'),'2;1');");
    printer.println("FILE_NAME('step','',(''),(''),'Step','','');");
    printer.println("FILE_SCHEMA(('" + schema.getName() + "'));");
    
    printer.println("ENDSEC;");
    printer.println();
    printer.println("DATA;");
  }
  
  protected void printData(PrintWriter printer)
  {
    for (Object entity : entityList)
    {
      String tag = "#" + entityMap.get(entity);
      ExpressType entityType = getEntityType(entity);
      printer.println(tag + "= " + exportObject(entity, entityType) + ";");
    }    
  }
  
  protected void printFooter(PrintWriter printer)
  {
    printer.println("ENDSEC;");
    printer.println("END-ISO-10303-21;");
  }
  
  protected ExpressEntity getEntityType(Object object)
  {
    String typeName = getTypeName(object);
    if (typeName != null)
    {
      ExpressNamedType namedType = schema.getNamedType(typeName);
      if (namedType instanceof ExpressEntity)
      {
        return (ExpressEntity)namedType;
      }
    }
    return null;
  }

  protected void registerObject(Object object)
  {
    if (object instanceof Collection)
    {
      Collection col = (List)object;
      for (Object value : col)
      {
        registerObject(value);
      }
    }
    else
    {
      ExpressEntity entityType = getEntityType(object);
      if (entityType != null)
      {
        if (entityMap.containsKey(object)) return;

        for (ExpressAttribute attribute : entityType.getAllAttributes())
        {
          Object value = getPropertyValue(object, attribute.getName());
          registerObject(value);
        }
        entityMap.put(object, ++tagCount);
        entityList.add(object);
      }
    }
  }

  protected String exportObject(Object object, ExpressType type)
  {
    StringBuilder buffer = new StringBuilder();
    if (object == null)
    {
      buffer.append("$");
    }
    else if (object instanceof Boolean)
    {
      Boolean booleanValue = (Boolean)object;
      if (Boolean.TRUE.equals(booleanValue))
      {
        buffer.append(".T.");
      }
      else
      {
        buffer.append(".F.");
      }
    }
    else if (object instanceof String)
    {
      String text = (String)object;
      if (type instanceof ExpressEnumeration)
      {
        buffer.append(text);
      }
      else if (text.equals(".T.") || text.equals(".F.")) // boolean
      {
        buffer.append(text);
      }
      else
      {
        // TODO: encode text
        buffer.append("'").append(encodeString(text)).append("'");
      }
    }
    else if (object instanceof Number)
    {
      Number number = (Number)object;
      buffer.append(formatNumber(number, type));
    }
    else if (object instanceof Collection)
    {
      ExpressType elementType = null;
      if (type instanceof ExpressCollection)
      {
        ExpressCollection collectionType = (ExpressCollection)type;
        elementType = collectionType.getElementType();
      }
      Collection col = (Collection)object;
      buffer.append('(');
      Iterator iter = col.iterator();
      if (iter.hasNext())
      {
        buffer.append(exportObjectWithTag(iter.next(), elementType));
        while (iter.hasNext())
        {
          buffer.append(",");
          buffer.append(exportObjectWithTag(iter.next(), elementType));
        }
      }
      buffer.append(')');
    }
    else
    {
      String typeName = getTypeName(object);
      if (typeName != null) // Entity
      {
        buffer.append(typeName.toUpperCase());
        buffer.append("(");
        ExpressNamedType namedType = schema.getNamedType(typeName);
        if (namedType instanceof ExpressEntity)
        {
          ExpressEntity entityType = (ExpressEntity)namedType;
          List<ExpressAttribute> attributes = entityType.getAllAttributes();
          Iterator<ExpressAttribute> iter = attributes.iterator();
          if (iter.hasNext())
          {
            ExpressAttribute attribute = iter.next();
            Object value = getPropertyValue(object, attribute.getName());
            buffer.append(exportObjectWithTag(value, attribute.getType()));
            while (iter.hasNext())
            {
              buffer.append(",");
              attribute = iter.next();
              value = getPropertyValue(object, attribute.getName());
              buffer.append(exportObjectWithTag(value, attribute.getType()));
            }
          }
        }
        else // DefinedType
        {
          buffer.append(exportObject(getValue(object), type));
        }
        buffer.append(')');
      }
      else buffer.append("*");
    }
    return buffer.toString();
  }

  protected String exportObjectWithTag(Object object, ExpressType type)
  {
    Integer tag = entityMap.get(object);
    if (tag == null) // not an entity
    {
      return exportObject(object, type);
    }
    else
    {
      return "#" + tag;
    }
  }
  
  protected String encodeString(String text)
  {
    StringBuilder buffer = new StringBuilder();
    for (int i = 0; i < text.length(); i++)
    {
      char ch = text.charAt(i);
      if (ch == '\'')
      {
        buffer.append("''");
      }
      else if (ch < 32)
      {
        buffer.append("\\X\\").append(String.format("%02X", (int)ch));
      }
      else if (ch >= 128)
      {
        buffer.append("\\X2\\").
          append(String.format("%04X", (int)ch)).
          append("\\X0\\"); 
      }
      else
      {
        buffer.append(ch);
      }
    }
    return buffer.toString();
  }
  
  protected String formatNumber(Number number, ExpressType type)
  {
    ExpressPrimitive primitive = null;
    if (type instanceof ExpressPrimitive)
    {
      primitive = (ExpressPrimitive)type;
    }
    else if (type instanceof ExpressDefinedType)
    {
      primitive = ((ExpressDefinedType)type).getPrimitive();
    }
    if (primitive == null)
    {
      return String.valueOf(number);
    }
    else
    {
      switch (primitive.getName())
      {
        case INTEGER: return String.valueOf(number.longValue());
        default: return String.valueOf(number.doubleValue());
      }
    }
  }
  
  protected abstract String getTypeName(Object object);

  protected abstract Object getPropertyValue(Object object, String propertyName);

  protected abstract Object getValue(Object object);
}
