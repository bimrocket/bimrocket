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

import com.mongodb.client.MongoCollection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.express.ExpressConstant;
import org.bimrocket.express.data.AbstractListData;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressEnumeration;
import static org.bimrocket.express.ExpressPrimitive.BOOLEAN_TYPE;
import static org.bimrocket.express.ExpressPrimitive.LOGICAL_TYPE;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.data.ExpressCursor;
import org.bimrocket.service.ifcdb.store.IfcData;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 *
 * @author realor
 */
public class MongoIfcData extends AbstractListData<Document> implements IfcData
{
  MongoCollection<Document> collection;
  Document ifcProject;
  Map<ObjectId, Document> cache = new HashMap<>();

  public MongoIfcData(ExpressSchema schema, MongoCollection<Document> collection)
  {
    super(schema);
    this.collection = collection;
    definedTypeValueName = "_value";
  }

  @Override
  public ExpressCursor getIfcProject()
  {
    return new Cursor(ifcProject){};
  }

  public void updateCache()
  {
    cache.clear();
    for (Document element : elements)
    {
      if (element.get("_id") instanceof ObjectId objectId)
      {
        cache.put(objectId, element);
      }
    }
  }

  @Override
  protected Document getElement(Object value)
  {
    if (value instanceof Document document)
    {
      return document;
    }
    return null;
  }

  @Override
  protected Document createEntity(ExpressEntity entity)
  {
    Document document = new Document();
    ObjectId objectId = new ObjectId();
    document.put("_id", objectId);
    document.put("_class", entity.getTypeName());
    document.put("_modelId", null);
    document.put("_version", null);
    cache.put(objectId, document);

    if (entity.getTypeName().equals("IfcProject"))
    {
      ifcProject = document;
    }
    return document;
  }

  @Override
  protected Document createDefinedType(ExpressDefinedType definedType)
  {
    Document document = new Document();
    document.put("_class", definedType.getTypeName());
    document.put("_value", null);

    return document;
  }

  @Override
  protected String getElementTypeName(Document document)
  {
    return document.get("_class", String.class);
  }

  @Override
  protected String getElementId(Document document)
  {
    ObjectId objectId = document.get("_id", ObjectId.class);
    return objectId == null ? null : objectId.toString();
  }

  @Override
  protected Object getElementValue(Document document, String name,
    ExpressType type)
  {
    Object value = dereference(document.get(name));
    return toExternalValue(value, type);
  }

  @Override
  protected void setElementValue(Document document, String name, Object value,
    ExpressType type)
  {
    value = toInternalValue(value, type);
    document.put(name, reference(value));
  }

  @Override
  protected void addCollectionValue(List<Object> collection, Object value,
    ExpressType type)
  {
    if (elements.equals(collection))
    {
      collection.add(value); // value is Document (entity)
    }
    else
    {
      value = toInternalValue(value, type);
      collection.add(reference(value));
    }
  }

  @Override
  protected Object getCollectionValue(List<Object> collection, int index,
    ExpressType type)
  {
    Object value = dereference(collection.get(index));
    return toExternalValue(value, type);
  }

  @Override
  protected void setCollectionValue(List<Object> collection, int index,
    Object value, ExpressType type)
  {
    if (elements.equals(collection))
    {
      collection.set(index, value); // value is Document (entity)
    }
    else
    {
      value = toInternalValue(value, type);
      collection.set(index, reference(value));
    }
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
    if (ExpressConstant.TRUE.equals(value)) return true;
    if (ExpressConstant.FALSE.equals(value)) return false;
    if (ExpressConstant.UNKNOWN.equals(value)) return null;

    if (value instanceof ExpressConstant constant)
    {
      return constant.toString();
    }
    return value;
  }

  protected Object dereference(Object value)
  {
    if (value instanceof ObjectId objectId)
    {
      Document document = cache.get(objectId);
      if (document == null) // not found in cache
      {
        document = collection.find(new Document("_id", objectId)).first();
        if (document == null)
          throw new NotFoundException("Invalid object reference");
        cache.put(objectId, document);
      }
      value = document;
    }
    return value;
  }

  protected Object reference(Object value)
  {
    if (value instanceof Document document)
    {
      ObjectId objectId = document.get("_id", ObjectId.class);
      if (objectId != null)
      {
        value = objectId;
      }
    }
    return value;
  }
}
