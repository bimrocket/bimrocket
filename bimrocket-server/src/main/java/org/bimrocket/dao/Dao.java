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
package org.bimrocket.dao;

import java.util.List;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;

/**
 * General interface for managing the persistance of an entity
 *
 * @author realor
 * @param <E> entity type
 * @param <ID> entity identifier type
 */
public interface Dao<E, ID>
{
  /**
   * Returns the entities that satisfy a search filter sorted by
   * orderBy expressions
   *
   * @param filter the filter
   * @param orderBy the list of order expression
   * @return
   */
  public List<E> find(Expression filter, List<OrderByExpression> orderBy);

  /**
   * Returns the entity identified by id
   *
   * @param id the entity identifier
   * @return the entity identified by id or null if it does not exists
   */
  public E findById(ID id);

  /**
   * Inserts a new entity
   *
   * @param entity the entity to insert
   * @return the inserted entity
   */
  public E insert(E entity);

  /**
   * Updates an existing entity
   *
   * @param entity the entity to update
   * @return the updated entity or null if the entity was not found
   */
  public E update(E entity);

  /** Saves an entity
   *
   * @param entity the entity to save
   * @return the saved entity
   */
  public E save(E entity);

  /**
   * Deletes an entity
   *
   * @param id the identifier of the entity to delete
   * @return true id the entity was delete or false if the entity was not found
   */
  public boolean deleteById(ID id);

  /**
   * Deletes the entities that satisfy a search filter
   * @param filter the filter
   * @return the number of entities deleted
   */
  public int delete(Expression filter);
}
