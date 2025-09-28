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
package org.bimrocket.express.data;

import java.util.ArrayList;
import java.util.List;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;

/**
 *
 * @author realor
 * @param <E>
 */
public abstract class AbstractListData<E> extends AbstractData<E, List<Object>>
{
  public AbstractListData(ExpressSchema schema)
  {
    super(schema);
  }

  @Override
  @SuppressWarnings("unchecked")
  protected List<Object> getCollection(Object value)
  {
    if (value instanceof List<?> list)
    {
      return (List<Object>)list;
    }
    return null;
  }

  @Override
  protected List<Object> createCollection(String colTypeName)
  {
    return new ArrayList<>();
  }

  @Override
  protected void setCollectionValue(List<Object> collection, int index,
    Object value, ExpressType type)
  {
    collection.set(index, value);
  }

  @Override
  protected Object getCollectionValue(List<Object> collection, int index,
    ExpressType type)
  {
    return collection.get(index);
  }

  @Override
  protected void addCollectionValue(List<Object> collection, Object value,
    ExpressType type)
  {
    collection.add(value);
  }

  @Override
  protected int getCollectionSize(List<Object> collection)
  {
    return collection.size();
  }
}
