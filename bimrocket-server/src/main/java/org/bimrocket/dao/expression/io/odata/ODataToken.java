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
package org.bimrocket.dao.expression.io.odata;

/**
 *
 * @author realor
 */
public class ODataToken
{
  public static final String EOF = "EOF";
  public static final String NULL = "NULL";
  public static final String STRING = "STRING";
  public static final String NUMBER = "NUMBER";
  public static final String BOOLEAN = "BOOLEAN";
  public static final String PROPERTY = "PROPERTY";
  public static final String OPERATOR = "OPERATOR";
  public static final String FUNCTION = "FUNCTION";
  public static final String SYMBOL = "SYMBOL";
  public static final String KEYWORD = "KEYWORD";

  private final String type;
  private final String text;
  private final Object value;

  public static final ODataToken EOF_TOKEN = new ODataToken(EOF);
  public static final ODataToken OPEN_TOKEN = new ODataToken(SYMBOL, "(");
  public static final ODataToken CLOSE_TOKEN = new ODataToken(SYMBOL, ")");
  public static final ODataToken COMMA_TOKEN = new ODataToken(SYMBOL, ",");
  public static final ODataToken TRUE_TOKEN = new ODataToken(BOOLEAN, "true", true);
  public static final ODataToken FALSE_TOKEN = new ODataToken(BOOLEAN, "false", false);
  public static final ODataToken NULL_TOKEN = new ODataToken(NULL, "null", null);
  public static final ODataToken ASC_TOKEN = new ODataToken(KEYWORD, "asc");
  public static final ODataToken DESC_TOKEN = new ODataToken(KEYWORD, "desc");

  ODataToken(String type)
  {
    this(type, "");
  }

  ODataToken(String type, String text)
  {
    this(type, text, null);
  }

  ODataToken(String type, String text, Object value)
  {
    this.type = type;
    this.text = text;
    this.value = value;
  }

  public String getType()
  {
    return type;
  }

  public String getText()
  {
    return text;
  }

  public Object getValue()
  {
    return value;
  }

  public boolean isType(String type)
  {
    return this.type.equals(type);
  }

  public boolean isLiteral()
  {
    return type.equals(NULL) ||
           type.equals(STRING) ||
           type.equals(NUMBER) ||
           type.equals(BOOLEAN);
  }

  public boolean isOperator()
  {
    return this.type.equals(OPERATOR);
  }

  public boolean isFunction()
  {
    return this.type.equals(FUNCTION);
  }

  public boolean isProperty()
  {
    return this.type.equals(PROPERTY);
  }

  public boolean isOpenParenthesis()
  {
    return equals(OPEN_TOKEN);
  }

  public boolean isCloseParenthesis()
  {
    return equals(CLOSE_TOKEN);
  }

  public boolean isComma()
  {
    return equals(COMMA_TOKEN);
  }

  public boolean isEOF()
  {
    return equals(EOF_TOKEN);
  }

  @Override
  public String toString()
  {
    return type + "[" + text + "]";
  }
}
