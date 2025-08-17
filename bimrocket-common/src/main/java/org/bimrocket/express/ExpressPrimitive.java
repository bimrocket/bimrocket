/*
 * BIMROCKET
 *
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
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

package org.bimrocket.express;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 *
 * @author realor
 */
public class ExpressPrimitive extends ExpressType
{
  public static final String STRING = "STRING";
  public static final String INTEGER = "INTEGER";
  public static final String REAL = "REAL";
  public static final String NUMBER = "NUMBER";
  public static final String BOOLEAN = "BOOLEAN";
  public static final String LOGICAL = "LOGICAL";
  public static final String BINARY = "BINARY";

  public static final Map<String, ExpressPrimitive> SIMPLE_TYPES =
    new ConcurrentHashMap<>();

  static
  {
    SIMPLE_TYPES.put(STRING, new ExpressPrimitive(STRING));
    SIMPLE_TYPES.put(INTEGER, new ExpressPrimitive(INTEGER));
    SIMPLE_TYPES.put(REAL, new ExpressPrimitive(REAL));
    SIMPLE_TYPES.put(NUMBER, new ExpressPrimitive(NUMBER));
    SIMPLE_TYPES.put(BOOLEAN, new ExpressPrimitive(BOOLEAN));
    SIMPLE_TYPES.put(LOGICAL, new ExpressPrimitive(LOGICAL));
    SIMPLE_TYPES.put(BINARY, new ExpressPrimitive(BINARY));
  }

  private final String name;

  public ExpressPrimitive(String name)
  {
    this.name = name;
  }

  public String getName()
  {
    return name;
  }

  public static ExpressPrimitive getPrimitive(String name)
  {
    return SIMPLE_TYPES.get(name);
  }

  public static boolean isPrimitive(String name)
  {
    return SIMPLE_TYPES.containsKey(name);
  }

  public boolean isString()
  {
    return STRING.equals(name);
  }

  public boolean isInteger()
  {
    return INTEGER.equals(name);
  }

  public boolean isReal()
  {
    return REAL.equals(name);
  }

  public boolean isNumber()
  {
    return NUMBER.equals(name);
  }

  public boolean isBoolean()
  {
    return BOOLEAN.equals(name);
  }

  public boolean isLogical()
  {
    return LOGICAL.equals(name);
  }

  public boolean isBinary()
  {
    return BINARY.equals(name);
  }
  
  @Override
  public String toString()
  {
    return name;
  }
}
