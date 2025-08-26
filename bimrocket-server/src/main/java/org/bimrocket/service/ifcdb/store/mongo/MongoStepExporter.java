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
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.step.io.StepExporter;
import org.bson.Document;
import org.bson.types.ObjectId;

/**
 *
 * @author realor
 */
public class MongoStepExporter extends StepExporter<Document, ObjectId>
{
  protected MongoCollection<Document> collection;
  protected Map<ObjectId, Document> cache = new HashMap<>();

  public MongoStepExporter(ExpressSchema schema, MongoCollection<Document> col)
  {
    super(schema);
    this.collection = col;
  }

  public void cacheDocuments(List<Document> documents)
  {
    for (Document document : documents)
    {
      ObjectId id = document.getObjectId("_id");
      cache.put(id, document);
    }
  }

  @Override
  protected String getTypeName(Document element)
  {
    return element.getString("_class");
  }

  @Override
  protected Object getPropertyValue(Document element,
    ExpressAttribute attribute, int index)
  {
    return element.get(attribute.getName());
  }

  @Override
  protected Object getValue(Document element)
  {
    return element.get("_value");
  }

  @Override
  protected Document dereference(Object value)
  {
    if (value instanceof ObjectId id)
    {
      return lookupObject(id);
    }
    else if (value instanceof Document element)
    {
      return element;
    }
    return null;
  }

  @Override
  protected ObjectId getIdentifier(Document entity)
  {
    return entity.getObjectId("_id");
  }

  protected Document lookupObject(ObjectId id)
  {
    Document element = cache.get(id);
    if (element == null) // not found in cache
    {
      element = collection.find(new Document("_id", id)).first();
      cache.put(id, element);
    }
    return element;
  }
}
