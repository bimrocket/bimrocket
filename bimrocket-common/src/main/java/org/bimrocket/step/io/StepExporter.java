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
 * Exports objects to STEP format for the given ExpressSchema.
 *
 * @author realor
 * @param <E> the class of elements to be exported
 * @param <ID> the entity identifier class
 */
public abstract class StepExporter<E, ID>
{
  protected ExpressSchema schema;
  protected Map<ID, Integer> entityTags = new HashMap<>();
  protected List<E> entityList = new ArrayList<>();
  protected int tagCount;
  protected StepFileDescription fileDescription = new StepFileDescription();
  protected StepFileName fileName = new StepFileName();

  public StepExporter(ExpressSchema schema)
  {
    this.schema = schema;
  }

  public StepFileDescription getFileDescription()
  {
    return fileDescription;
  }

  public StepFileName getFileName()
  {
    return fileName;
  }

  public void export(Writer writer, List<E> elements)
  {
    tagCount = 0;
    entityTags.clear();
    entityList.clear();
    for (E element : elements)
    {
      ExpressEntity entityType = getEntityType(element);
      if (entityType != null) // is entity
      {
        registerObject(element);
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
    printer.println(fileDescription);
    printer.println(fileName);
    printer.println("FILE_SCHEMA(('" + schema.getName() + "'));");

    printer.println("ENDSEC;");
    printer.println();
    printer.println("DATA;");
  }

  protected void printData(PrintWriter printer)
  {
    for (E entity : entityList)
    {
      ID id = getIdentifier(entity);
      String tag = "#" + entityTags.get(id);
      ExpressType entityType = getEntityType(entity);
      printer.println(tag + "= " + exportObject(entity, entityType) + ";");
    }
  }

  protected void printFooter(PrintWriter printer)
  {
    printer.println("ENDSEC;");
    printer.println("END-ISO-10303-21;");
  }

  protected ExpressEntity getEntityType(E element)
  {
    String typeName = getTypeName(element);
    if (typeName != null)
    {
      ExpressNamedType namedType = schema.getNamedType(typeName);
      if (namedType instanceof ExpressEntity entityType)
      {
        return entityType;
      }
    }
    return null;
  }

  protected void registerObject(Object object)
  {
    if (object instanceof Collection<?> col)
    {
      for (Object value : col)
      {
        registerObject(value);
      }
    }
    else
    {
      E element = dereference(object);
      if (element != null)
      {
        ExpressEntity entityType = getEntityType(element);
        if (entityType != null)
        {
          E entity = element;
          ID id = getIdentifier(entity);
          if (entityTags.containsKey(id)) return;

          int index = 1;
          for (ExpressAttribute attribute : entityType.getAllAttributes())
          {
            Object value = getPropertyValue(entity, attribute, index++);
            registerObject(value);
          }
          entityTags.put(id, ++tagCount);
          entityList.add(entity);
        }
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
    else if (object instanceof Boolean booleanValue)
    {
      if (Boolean.TRUE.equals(booleanValue))
      {
        buffer.append(".T.");
      }
      else
      {
        buffer.append(".F.");
      }
    }
    else if (object instanceof String text)
    {
      if (type instanceof ExpressEnumeration)
      {
        buffer.append(text); // save as .<enum_value>.
      }
      else if (".T.".equals(text) || ".F.".equals(text) || ".U.".equals(text))
      {
        buffer.append(text); // assume type is logical
      }
      else // literal string
      {
        buffer.append("'").append(encodeString(text)).append("'");
      }
    }
    else if (object instanceof Number number)
    {
      buffer.append(formatNumber(number, type));
    }
    else if (object instanceof Collection<?> col)
    {
      ExpressType elementType = null;
      if (type instanceof ExpressCollection collectionType)
      {
        elementType = collectionType.getElementType();
      }
      buffer.append('(');
      Iterator<?> iter = col.iterator();
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
      E element = dereference(object);
      if (element != null)
      {
        String typeName = getTypeName(element);
        if (typeName != null)
        {
          buffer.append(typeName.toUpperCase());
          buffer.append("(");
          ExpressNamedType namedType = schema.getNamedType(typeName);
          if (namedType instanceof ExpressEntity entityType)
          {
            List<ExpressAttribute> attributes = entityType.getAllAttributes();
            Iterator<ExpressAttribute> iter = attributes.iterator();
            if (iter.hasNext())
            {
              int index = 1;
              ExpressAttribute attribute = iter.next();
              Object value = getPropertyValue(element, attribute, index++);
              buffer.append(exportObjectWithTag(value, attribute.getType()));
              while (iter.hasNext())
              {
                buffer.append(",");
                attribute = iter.next();
                value = getPropertyValue(element, attribute, index++);
                buffer.append(exportObjectWithTag(value, attribute.getType()));
              }
            }
          }
          else if (namedType instanceof ExpressDefinedType definedType)
          {
            buffer.append(exportObject(getValue(element),
              definedType.getDefinition()));
          }
          buffer.append(')');
        }
        else buffer.append("*");
      }
      else buffer.append("*");
    }
    return buffer.toString();
  }

  protected String exportObjectWithTag(Object object, ExpressType type)
  {
    Integer tag = null;

    E element = dereference(object);
    if (element != null)
    {
      ID id = getIdentifier(element);
      tag = entityTags.get(id);
    }
    return tag == null ? exportObject(object, type) : "#" + tag;
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
        case INTEGER: return String.valueOf(number.intValue());
        default: return String.valueOf(number.doubleValue());
      }
    }
  }

  /**
   * Gets the type name of a NamedType instance
   *
   * @param element the element instance (ExpressEntity or ExpressDefinedType)
   * @return the type name of the element
   */
  protected abstract String getTypeName(E element);

  /**
   * Gets the value of a property of an entity
   *
   * @param entity the ExpressEntity instance
   * @param attribute the entity attribute to be set
   * @param index the position of the attribute (1-based)
   * @return the value of the specified attribute of element
   */
  protected abstract Object getPropertyValue(E entity,
    ExpressAttribute attribute, int index);

  /**
   * Gets the value of an ExpressDefinedType instance
   *
   * @param element an ExpressDefinedType instance
   * @return the value of this defined type instance
   */
  protected abstract Object getValue(E element);

  /**
   * Dereference an element
   *
   * @param value a value that may reference an element
   * @return the element referenced by value or null if value does not
   * reference any element.
   */
  protected abstract E dereference(Object value);

  /**
   * Gets the entity identifier
   *
   * @param entity the entity to get the identifier from
   * @return the entity identifier
   */
  protected abstract ID getIdentifier(E entity);
}
