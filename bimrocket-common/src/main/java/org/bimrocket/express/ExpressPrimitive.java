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

import java.util.HashMap;
import java.util.Map;

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

  public static final ExpressPrimitive STRING_TYPE = new ExpressPrimitive(STRING);
  public static final ExpressPrimitive INTEGER_TYPE = new ExpressPrimitive(INTEGER);
  public static final ExpressPrimitive REAL_TYPE = new ExpressPrimitive(REAL);
  public static final ExpressPrimitive NUMBER_TYPE = new ExpressPrimitive(NUMBER);
  public static final ExpressPrimitive BOOLEAN_TYPE = new ExpressPrimitive(BOOLEAN);
  public static final ExpressPrimitive LOGICAL_TYPE = new ExpressPrimitive(LOGICAL);
  public static final ExpressPrimitive BINARY_TYPE = new ExpressPrimitive(BINARY);

  public static final Map<String, ExpressPrimitive> TYPES = new HashMap<>();

  static
  {
    TYPES.put(STRING, STRING_TYPE);
    TYPES.put(INTEGER, INTEGER_TYPE);
    TYPES.put(REAL, REAL_TYPE);
    TYPES.put(NUMBER, NUMBER_TYPE);
    TYPES.put(BOOLEAN, BOOLEAN_TYPE);
    TYPES.put(LOGICAL, LOGICAL_TYPE);
    TYPES.put(BINARY, BINARY_TYPE);
  }

  public ExpressPrimitive(String typeName)
  {
    super(typeName);
  }

  public static ExpressPrimitive getPrimitive(String typeName)
  {
    return TYPES.get(typeName);
  }

  public static boolean isPrimitive(String typeName)
  {
    return TYPES.containsKey(typeName);
  }

  public boolean isString()
  {
    return STRING.equals(getTypeName());
  }

  public boolean isInteger()
  {
    return INTEGER.equals(getTypeName());
  }

  public boolean isReal()
  {
    return REAL.equals(getTypeName());
  }

  public boolean isNumber()
  {
    return NUMBER.equals(getTypeName());
  }

  public boolean isBoolean()
  {
    return BOOLEAN.equals(getTypeName());
  }

  public boolean isLogical()
  {
    return LOGICAL.equals(getTypeName());
  }

  public boolean isBinary()
  {
    return BINARY.equals(getTypeName());
  }

  @Override
  public boolean equals(Object other)
  {
    if (other instanceof ExpressPrimitive primitive)
    {
      return getTypeName().equals(primitive.getTypeName());
    }
    return false;
  }

  @Override
  public int hashCode()
  {
    return getTypeName().hashCode();
  }
}
