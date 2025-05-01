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
package org.bimrocket.dao.empty;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.bimrocket.dao.Dao;

/**
 *
 * @author realor
 * @param <E> the type managed by this DAO
 */
public class EmptyDao<E> implements Dao<E>
{
  @Override
  public List<E> select(Map<String, Object> filter, Collection<String> orderBy)
  {
    return Collections.emptyList();
  }

  @Override
  public Object select(String groupExpression, Map<String, Object> filter)
  {
    return null;
  }

  @Override
  public E select(Object id)
  {
    return null;
  }

  @Override
  public E insert(E entity)
  {
    return entity;
  }

  @Override
  public E update(E entity)
  {
    return entity;
  }

  @Override
  public E insertOrUpdate(E entity)
  {
    return entity;
  }

  @Override
  public boolean delete(Object id)
  {
    return false;
  }

  @Override
  public int delete(Map<String, Object> filter)
  {
    return 0;
  }
}
