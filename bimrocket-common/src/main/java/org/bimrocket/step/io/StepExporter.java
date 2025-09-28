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

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.Writer;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressConstant;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressPrimitive;
import static org.bimrocket.express.ExpressPrimitive.INTEGER;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.data.ExpressCursor;
import static org.bimrocket.express.data.ExpressCursor.CONTAINER;
import org.bimrocket.express.data.ExpressData;
import org.bimrocket.step.header.StepFileHeaderData;
import org.bimrocket.step.header.StepFileSchema;


/**
 * Exports objects to STEP format for the given ExpressSchema.
 *
 * @author realor
 */

public class StepExporter
{
  protected ExpressData data;
  protected StepFileHeaderData headerData = new StepFileHeaderData();
  protected ExpressSchema schema;
  protected Map<String, Integer> entityTags = new HashMap<>();
  protected List<ExpressCursor> entityList = new LinkedList<>();
  protected int tagCount;
  protected PrintWriter printer;
  protected boolean backwardReferences;

  public StepExporter(ExpressData data)
  {
    this.data = data;
    this.schema = data.getSchema();
  }

  public ExpressData getData()
  {
    return data;
  }

  public StepFileHeaderData getHeaderData()
  {
    return headerData;
  }

  public void setHeaderData(StepFileHeaderData headerData)
  {
    this.headerData = headerData;
  }

  public boolean isBackwardReferences()
  {
    return backwardReferences;
  }

  public void setBackwardReferences(boolean backwardReferences)
  {
    this.backwardReferences = backwardReferences;
  }

  public void export(String filename) throws IOException
  {
    export(new File(filename));
  }

  public void export(File file) throws IOException
  {
    try (BufferedWriter writer =
          new BufferedWriter(new OutputStreamWriter(new FileOutputStream(file))))
    {
      export(writer);
    }
  }

  public void export(Writer writer)
  {
    tagCount = 0;
    entityTags.clear();
    entityList.clear();

    StepFileSchema fileSchema = headerData.getFileSchema();
    if (!fileSchema.getSchemas().contains(schema.getName()))
    {
      fileSchema.getSchemas().add(schema.getName());
    }

    registerEntities(data.getRoot());

    printer = new PrintWriter(writer);
    try
    {
      printHeader();
      printData();
      printFooter();
    }
    finally
    {
      printer.close();
    }
  }

  protected void printHeader()
  {
    printer.println("ISO-10303-21;");
    printer.println("HEADER;");
    printHeaderData();
    printer.println("ENDSEC;");
    printer.println();
    printer.println("DATA;");
  }

  protected void printHeaderData()
  {
    ExpressCursor cursor = headerData.getRoot();
    for (int i = 0; i < cursor.size(); i++)
    {
      cursor.enter(i);
      exportEntity(cursor);
      cursor.exit();
      printer.println(";");
    }
  }

  protected void printData()
  {
    int tag = 1;
    for (ExpressCursor entityCursor : entityList)
    {
      printer.print("#" + tag + "= ");
      exportEntity(entityCursor);
      printer.println(";");
      tag++;
    }
  }

  protected void printFooter()
  {
    printer.println("ENDSEC;");
    printer.println("END-ISO-10303-21;");
  }

  protected void registerEntities(ExpressCursor cursor)
  {
    String id = null;

    ExpressType type = cursor.getType();
    if (type instanceof ExpressEntity)
    {
      id = cursor.getId();
      if (id == null) throw new RuntimeException("Entity id is null");

      if (entityTags.containsKey(id)) return; // already visited

      if (backwardReferences)
      {
        // provisional value
        entityTags.put(id, 0);
      }
      else
      {
        // final value
        entityTags.put(id, ++tagCount);
        entityList.add(cursor.copy());
      }
    }

    int size = cursor.size();
    for (int index = 0; index < size; index++)
    {
      Object value = cursor.get(index);
      if (CONTAINER.equals(value))
      {
        cursor.enter(index);
        registerEntities(cursor);
        cursor.exit();
      }
    }

    if (backwardReferences && id != null)
    {
      // final value
      entityTags.put(id, ++tagCount);
      entityList.add(cursor.copy());
    }
  }

  protected void exportEntity(ExpressCursor cursor)
  {
    ExpressType type = cursor.getType();
    if (type instanceof ExpressEntity entity)
    {
      List<ExpressAttribute> attributes = entity.getAllAttributes();

      printer.print(type.getTypeName().toUpperCase());
      printer.print("(");

      int size = cursor.size();
      for (int index = 0; index < size; index++)
      {
        ExpressType expectedType = attributes.get(index).getType();
        exportItem(cursor, index, expectedType);
      }
      printer.print(")");
    }
    else throw new RuntimeException("Not an entity type");
  }

  protected void exportDefinedType(ExpressCursor cursor)
  {
    ExpressType type = cursor.getType();
    if (type instanceof ExpressDefinedType definedType)
    {
      printer.print(type.getTypeName().toUpperCase());
      printer.print("(");
      exportItem(cursor, 0, definedType.getRootType());
      printer.print(")");
    }
    else throw new RuntimeException("Not a defined type");
  }

  protected void exportCollection(ExpressCursor cursor)
  {
    ExpressType type = cursor.getType();
    if (type instanceof ExpressCollection colType)
    {
      printer.print("(");
      ExpressType expectedType = colType.getItemType();
      for (int index = 0; index < cursor.size(); index++)
      {
        exportItem(cursor, index, expectedType);
      }
      printer.print(")");
    }
    else throw new RuntimeException("Not a collection");
  }

  protected void exportItem(ExpressCursor cursor, int index,
    ExpressType expectedType)
  {
    if (index > 0) printer.print(",");

    Object value = cursor.get(index);

    if (CONTAINER.equals(value))
    {
      cursor.enter(index);
      ExpressType type = cursor.getType();

      if (type instanceof ExpressEntity)
      {
        String id = cursor.getId();
        Integer tag = entityTags.get(id);
        printer.print("#" + tag);
      }
      else if (type instanceof ExpressDefinedType)
      {
        exportDefinedType(cursor);
      }
      else // Collection
      {
        exportCollection(cursor);
      }
      cursor.exit();
    }
    else
    {
      exportBasicType(value, expectedType);
    }
  }

  protected void exportBasicType(Object object, ExpressType type)
  {
    if (object == null)
    {
      printer.print("$");
    }
    else if (object instanceof ExpressConstant constant)
    {
      printer.print("." + constant + ".");
    }
    else if (object instanceof String text)
    {
      printer.print("'" + encodeString(text) + "'");
    }
    else if (object instanceof Number number)
    {
      printer.print(formatNumber(number, type));
    }
    else if (object instanceof Boolean booleanValue) // unnecessary
    {
      if (Boolean.TRUE.equals(booleanValue))
      {
        printer.print(".T.");
      }
      else
      {
        printer.print(".F.");
      }
    }
    else printer.print("$");
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
      switch (primitive.getTypeName())
      {
        case INTEGER: return String.valueOf(number.intValue());
        default: return String.valueOf(number.doubleValue());
      }
    }
  }
}
