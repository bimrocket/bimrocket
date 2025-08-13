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
import java.util.Map;

/**
 *
 * @author realor
 */
public class Chronometer
{
  static final String TOTAL_MARK = "_total_";
  static final String LAST_MARK = "_last_";
  Map<String, Long> marks = new HashMap<>();

  public Chronometer()
  {
    init();
  }

  public void mark()
  {
    mark(LAST_MARK);
  }

  public void mark(String name)
  {
    long now = System.currentTimeMillis();
    marks.put(name, now);
  }

  public long millis()
  {
    return millis(LAST_MARK);
  }

  public long millis(String name)
  {
    Long millis = marks.get(name);
    if (millis == null) throw new RuntimeException("Inivalid mark");

    long now = System.currentTimeMillis();
    return now - millis;
  }

  public long totalMillis()
  {
    return millis(TOTAL_MARK);
  }

  public double seconds()
  {
    return seconds(LAST_MARK);
  }

  public double seconds(String name)
  {
    return millis(name) / 1000.0;
  }

  public double totalSeconds()
  {
    return seconds(TOTAL_MARK);
  }

  public void reset()
  {
    marks.clear();
    init();
  }

  private void init()
  {
    long now = System.currentTimeMillis();
    marks.put(TOTAL_MARK, now);
    marks.put(LAST_MARK, now);
  }
}
