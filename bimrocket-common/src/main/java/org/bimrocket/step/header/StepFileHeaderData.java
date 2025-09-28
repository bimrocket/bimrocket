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
package org.bimrocket.step.header;

import java.lang.reflect.Field;
import java.util.List;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressPrimitive;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.data.AbstractListData;

/**
 *
 * @author realor
 */

public class StepFileHeaderData extends AbstractListData<StepFileHeader>
{
  static ExpressSchema schema = getHeaderSchema();
  private final StepFileDescription fileDescription = new StepFileDescription();
  private final StepFileName fileName = new StepFileName();
  private final StepFileSchema fileSchema = new StepFileSchema();

  public StepFileHeaderData()
  {
    super(schema);
    elements.add(fileDescription);
    elements.add(fileName);
    elements.add(fileSchema);
  }

  public StepFileDescription getFileDescription()
  {
    return fileDescription;
  }

  public StepFileName getFileName()
  {
    return fileName;
  }

  public StepFileSchema getFileSchema()
  {
    return fileSchema;
  }

  @Override
  protected StepFileHeader getElement(Object value)
  {
    if (value instanceof StepFileHeader header)
    {
      return header;
    }
    return null;
  }

  @Override
  protected StepFileHeader createEntity(ExpressEntity entity)
  {
    return switch (entity.getTypeName())
    {
      case "FILE_DESCRIPTION" -> fileDescription;
      case "FILE_NAME" -> fileName;
      case "FILE_SCHEMA" -> fileSchema;
      default -> null;
    };
  }

  @Override
  protected StepFileHeader createDefinedType(ExpressDefinedType definedType)
  {
    throw new RuntimeException("Unsupported type " + definedType.getTypeName());
  }

  @Override
  protected String getElementTypeName(StepFileHeader element)
  {
    return element.getTypeName();
  }

  @Override
  protected String getElementId(StepFileHeader element)
  {
    return null;
  }

  @Override
  protected Object getElementValue(StepFileHeader element, String name,
    ExpressType type)
  {
    try
    {
      Field field = element.getClass().getDeclaredField(name);
      field.setAccessible(true);
      return field.get(element);
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  @Override
  protected void setElementValue(StepFileHeader element, String name, Object value,
    ExpressType type)
  {
    try
    {
      Field field = element.getClass().getDeclaredField(name);
      field.setAccessible(true);
      field.set(element, value);
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  @Override
  protected void addCollectionValue(List<Object> collection, Object value,
    ExpressType type)
  {
    if (elements.equals(collection)) return;
    super.addCollectionValue(collection, value, type);
  }

  @Override
  protected void setCollectionValue(List<Object> collection, int index, Object value,
    ExpressType type)
  {
    if (elements.equals(collection)) return;
    super.setCollectionValue(collection, index, value, type);
  }

  public static ExpressSchema getHeaderSchema()
  {
    ExpressSchema headerSchema = new ExpressSchema();

    ExpressPrimitive stringType =
      ExpressPrimitive.getPrimitive(ExpressPrimitive.STRING);

    ExpressCollection stringListType =
      new ExpressCollection(ExpressCollection.LIST);
    stringListType.setItemType(stringType);

    // FILE_DESCRIPTION

    ExpressEntity fileDescription = new ExpressEntity("FILE_DESCRIPTION");
    headerSchema.addNamedType(fileDescription);

    ExpressAttribute descAttr = new ExpressAttribute("description");
    descAttr.setType(stringListType);
    fileDescription.getAttributes().add(descAttr);

    ExpressAttribute implLevelAttr = new ExpressAttribute("implementationLevel");
    implLevelAttr.setType(stringType);
    fileDescription.getAttributes().add(implLevelAttr);

    // FILE_NAME

    ExpressEntity fileName = new ExpressEntity("FILE_NAME");
    headerSchema.addNamedType(fileName);

    ExpressAttribute nameAttr = new ExpressAttribute("name");
    nameAttr.setType(stringType);
    fileName.getAttributes().add(nameAttr);

    ExpressAttribute timestampAttr = new ExpressAttribute("timestamp");
    timestampAttr.setType(stringType);
    fileName.getAttributes().add(timestampAttr);

    ExpressAttribute authorAttr = new ExpressAttribute("author");
    authorAttr.setType(stringListType);
    fileName.getAttributes().add(authorAttr);

    ExpressAttribute orgAttr = new ExpressAttribute("organization");
    orgAttr.setType(stringListType);
    fileName.getAttributes().add(orgAttr);

    ExpressAttribute preproAttr = new ExpressAttribute("preprocessorVersion");
    preproAttr.setType(stringType);
    fileName.getAttributes().add(preproAttr);

    ExpressAttribute authoAttr = new ExpressAttribute("authorization");
    authoAttr.setType(stringType);
    fileName.getAttributes().add(authoAttr);

    ExpressAttribute otherAttr = new ExpressAttribute("other");
    otherAttr.setType(stringType);
    fileName.getAttributes().add(otherAttr);

    // FILE_SCHEMA

    ExpressEntity fileSchema = new ExpressEntity("FILE_SCHEMA");
    headerSchema.addNamedType(fileSchema);

    ExpressAttribute schemasAttr = new ExpressAttribute("schemas");
    schemasAttr.setType(stringListType);
    fileSchema.getAttributes().add(schemasAttr);

    return headerSchema;
  }
}
