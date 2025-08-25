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
package org.bimrocket.service.ifcdb.store.mongo;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.service.ifcdb.store.mongo.MongoStepLoader.MongoElements;
import org.bimrocket.step.io.DefinedTypeStepBuilder;
import org.bimrocket.step.io.EntityStepBuilder;
import org.bimrocket.step.io.ListBuilder;
import org.bimrocket.step.io.StepBuilder;
import org.bimrocket.step.io.StepLoader;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 *
 * @author realor
 */
public class MongoStepLoader extends StepLoader<MongoElements>
{
  public MongoStepLoader(ExpressSchema schema)
  {
    super(schema);
  }

  @Override
  public StepBuilder<? extends Object> createBuilder(ExpressType type,
    ExpressType expectedType)
  {
    if (type instanceof ExpressEntity entity)
    {
      return new DocumentBuilder(entity);
    }
    else if (type instanceof ExpressDefinedType definedType)
    {
      if (expectedType instanceof ExpressDefinedType expectedDefinedType)
      {
        if (expectedDefinedType.getPrimitive() != null)
        {
          // Do not save an Document when it is no necessary.
          // Use a PrimitiveBuilder instead to save the primitive value directly
          return new PrimitiveBuilder(definedType);
        }
      }
      // Create an OElement for other cases (like IfcPropertySingleValue)
      return new SimpleDocumentBuilder(definedType);
    }
    else if (type instanceof ExpressCollection col)
    {
      return new MongoListBuilder(col, new ArrayList<>());
    }
    return null;
  }

  @Override
  protected MongoElements createModel()
  {
    return new MongoElements();
  }

  public class MongoElements
  {
    Document project;
    List<Document> elements = new ArrayList<>();

    public Document getProject()
    {
      return project;
    }

    public List<Document> getElements()
    {
      return elements;
    }
  }

  class DocumentBuilder extends EntityStepBuilder<Document>
  {
    DocumentBuilder(ExpressEntity type)
    {
      this.type = type;
      String id = UUID.randomUUID().toString();
      this.instance = new Document();
      this.instance.put("_id", new ObjectId());
      this.instance.put("_class", type.getName());
      this.instance.put("_modelId", null);
      this.instance.put("_version", null);

      model.elements.add(instance);
      if (type.getName().equals("IfcProject"))
      {
        model.project = instance;
      }
    }

    @Override
    public void set(int index, Object item)
    {
      if (item instanceof Document document)
      {
        item = getReferenceTo(document);
      }
      List<ExpressAttribute> attributes = type.getAllAttributes();
      if (index < attributes.size())
      {
        ExpressAttribute attribute = attributes.get(index);
        set(attribute.getName(), item);
      }
    }

    @Override
    public void set(String attributeName, Object item)
    {
      if (attributeName == null) return;

      instance.put(attributeName, item);
    }
  }

  class SimpleDocumentBuilder extends DefinedTypeStepBuilder<Document>
  {
    SimpleDocumentBuilder(ExpressDefinedType definedType)
    {
      this.type = definedType;
      this.instance = new Document();
      this.instance.put("_class", definedType.getName());
    }

    @Override
    public void set(int index, Object item)
    {
      instance.put("_value", item);
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
      instance = item;
    }
  }

  class MongoListBuilder extends ListBuilder
  {
    public MongoListBuilder(ExpressCollection type, List<Object> list)
    {
      super(type, list);
    }

    @Override
    public int add(Object item)
    {
      if (item instanceof Document element)
      {
        item = getReferenceTo(element);
      }
      instance.add(item);
      return instance.size() - 1;
    }

    @Override
    public void set(int index, Object item)
    {
      if (item instanceof Document element)
      {
        item = getReferenceTo(element);
      }
      instance.set(index, item);
    }
  }

  Object getReferenceTo(Document document)
  {
    if (document.containsKey("_value")) return document;

    return document.get("_id");
  }
}
