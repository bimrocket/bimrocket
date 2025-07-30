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
package org.bimrocket.dao.mongo;

import com.mongodb.client.ClientSession;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import static com.mongodb.client.model.Filters.eq;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;
import java.util.ArrayList;
import java.util.List;
import org.bimrocket.dao.Dao;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.util.EntityDefinition;
import org.bson.Document;

/**
 *
 * @author realor
 * @param <E> the entity type managed by this DAO
 * @param <ID> the entity identifier type
 */
public class MongoDao<E, ID> implements Dao<E, ID>
{
  private final ClientSession session;
  private final MongoDatabase db;
  private final Class<E> cls;
  private final EntityDefinition definition;

  public MongoDao(ClientSession session, MongoDatabase db, Class<E> cls)
  {
    this.session = session;
    this.db = db;
    this.cls = cls;
    this.definition = EntityDefinition.getInstance(cls);
  }

  @Override
  public List<E> find(Expression filter, List<OrderByExpression> orderByList)
  {
    MongoCollection<E> collection = getCollection();
    MongoCursor<E> cursor;

    var generator = new MongoExpressionGenerator();

    if (orderByList != null && !orderByList.isEmpty())
    {
      List<Document> aggregate = generator.generateAggregate(filter, orderByList);
      cursor = collection.aggregate(session, aggregate, cls).cursor();
    }
    else if (filter != null)
    {
      Document filterDocument = generator.generateFilter(filter);
      cursor = collection.find(session, filterDocument).cursor();
    }
    else
    {
      cursor = collection.find(session).cursor();
    }

    List<E> elements = new ArrayList<>();
    while (cursor.hasNext())
    {
      elements.add(cursor.next());
    }
    return elements;
  }

  @Override
  public E findById(ID id)
  {
    MongoCollection<E> collection = getCollection();
    return collection.find(session, eq("_id", id)).first();
  }

  @Override
  public E insert(E entity)
  {
    MongoCollection<E> collection = getCollection();
    collection.insertOne(session, entity);
    return entity;
  }

  @Override
  public E update(E entity)
  {
    Object id = definition.getEntityId(entity);

    MongoCollection<E> collection = getCollection();

    UpdateResult result = collection.replaceOne(session, eq("_id", id), entity);
    if (result.getMatchedCount() == 0) return null;

    return entity;
  }

  @Override
  public E save(E entity)
  {
    Object id = definition.getEntityId(entity);

    MongoCollection<E> collection = getCollection();

    UpdateResult result = collection.replaceOne(session, eq("_id", id), entity);
    if (result.getMatchedCount() == 0)
    {
      collection.insertOne(session, entity);
    }
    return entity;
  }

  @Override
  public boolean deleteById(ID id)
  {
    MongoCollection<E> collection = getCollection();
    DeleteResult result = collection.deleteOne(session, eq("_id", id));

    return result.getDeletedCount() > 0;
  }

  @Override
  public int delete(Expression filter)
  {
    var generator = new MongoExpressionGenerator();
    Document filterDocument = generator.generateFilter(filter);
    MongoCollection<E> collection = getCollection();
    DeleteResult result = collection.deleteMany(session, filterDocument);

    return (int)result.getDeletedCount();
  }

  protected MongoCollection<E> getCollection()
  {
    return db.getCollection(cls.getSimpleName(), cls);
  }
}
