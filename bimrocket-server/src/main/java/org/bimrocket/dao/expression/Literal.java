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
package org.bimrocket.dao.expression;

/**
 *
 * @author realor
 */
public class Literal extends Expression
{
  public static final Literal NULL_VALUE = new Literal(NULL, null);
  public static final Literal TRUE_VALUE = new Literal(BOOLEAN, true);
  public static final Literal FALSE_VALUE = new Literal(BOOLEAN, false);

  String type;
  Object value;

  public Literal(String type, Object value)
  {
    this.type = type;
    this.value = value;
  }

  @Override
  public String getType()
  {
    return type;
  }

  public Object getValue()
  {
    return value;
  }

  public static Literal valueOf(Object value)
  {
    if (value == null)
    {
      return NULL_VALUE;
    }
    else if (value instanceof String)
    {
      return new Literal(STRING, value);
    }
    else if (value instanceof Number)
    {
      return new Literal(NUMBER, value);
    }
    else if (value instanceof Boolean)
    {
      Boolean boolValue = (Boolean)value;
      return boolValue ? TRUE_VALUE : FALSE_VALUE;
    }
    else throw new RuntimeException("Invalid literal " + value);
  }
}
