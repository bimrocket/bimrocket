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
package org.bimrocket.util;

import java.util.HashMap;
import java.util.Iterator;

/**
 *
 * @author realor
 * @param <E>
 */
public class ExpiringCache<E>
{
  HashMap<String, Slot<E>> map = new HashMap<>();
  long timeout;
  long purgeInterval;
  long lastPurge;

  public ExpiringCache(long timeout)
  {
    this.timeout = timeout;
    this.purgeInterval = timeout;
  }

  public ExpiringCache(long timeout, long purgeInterval)
  {
    this.timeout = timeout;
    this.purgeInterval = purgeInterval;
  }

  public synchronized E get(String key)
  {
    purge();

    Slot<E> slot = map.get(key);
    if (slot != null)
    {
      if (slot.isExpired())
      {
        map.remove(key);
      }
      else
      {
        return slot.element;
      }
    }
    return null;
  }

  public synchronized void put(String key, E value)
  {
    Slot<E> slot = new Slot<>(value);
    map.put(key, slot);
  }

  public synchronized void remove(String key)
  {
    map.remove(key);
  }

  @Override
  public synchronized String toString()
  {
    return map.toString();
  }

  private synchronized void purge()
  {
    if (System.currentTimeMillis() - lastPurge < purgeInterval) return;

    Iterator<Slot<E>> iter = map.values().iterator();
    while (iter.hasNext())
    {
      Slot<E> slot = iter.next();
      if (slot.isExpired()) iter.remove();
    }
    lastPurge = System.currentTimeMillis();
  }

  class Slot<E>
  {
    E element;
    long created;

    Slot(E element)
    {
      this.element = element;
      created = System.currentTimeMillis();
    }

    boolean isExpired()
    {
      return System.currentTimeMillis() - created > timeout;
    }

    @Override
    public String toString()
    {
      return String.valueOf(element);
    }
  }
}
