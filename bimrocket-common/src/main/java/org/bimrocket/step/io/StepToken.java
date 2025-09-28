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

package org.bimrocket.step.io;

/**
 *
 * @author realor
 */
public class StepToken
{
  public static final String KEYWORD = "KEYWORD";
  public static final String IDENTIFIER = "IDENTIFIER";
  public static final String TEXT = "TEXT";
  public static final String NUMBER = "NUMBER";
  public static final String CONSTANT = "CONSTANT";
  public static final String REFERENCE = "REFERENCE";
  public static final String COMMENT = "COMMENT";
  public static final String INVALID = "INVALID";
  public static final String EOF = "EOF";
  public static final String OPEN_PARENTHESIS = "OPEN_PAREN";
  public static final String CLOSE_PARENTHESIS = "CLOSE_PAREN";
  public static final String COMMA = "COMMA";
  public static final String COLON = "COLON";
  public static final String DOLLAR = "DOLLAR";
  public static final String ASTERISC = "ASTERISC";
  public static final String EQUAL = "EQUAL";

  public static final StepToken OPEN_PARENTHESIS_TOKEN =
    new StepToken(OPEN_PARENTHESIS);
  public static final StepToken CLOSE_PARENTHESIS_TOKEN =
    new StepToken(CLOSE_PARENTHESIS);
  public static final StepToken COMMA_TOKEN =
    new StepToken(COMMA);
  public static final StepToken COLON_TOKEN =
    new StepToken(COLON);
  public static final StepToken DOLLAR_TOKEN =
    new StepToken(DOLLAR);
  public static final StepToken ASTERISC_TOKEN =
    new StepToken(ASTERISC);
  public static final StepToken EQUAL_TOKEN =
    new StepToken(EQUAL);
  public static final StepToken EOF_TOKEN =
    new StepToken(EOF);

  private final String type;
  private final Object value;

  public StepToken(String type)
  {
    this.type = type;
    this.value = null;
  }

  public StepToken(String type, Object value)
  {
    this.type = type;
    this.value = value;
  }

  public String getType()
  {
    return type;
  }

  public Object getValue()
  {
    return value;
  }

  public boolean isIdentifier()
  {
    return this.type.equals(IDENTIFIER);
  }

  public boolean isNumber()
  {
    return this.type.equals(NUMBER);
  }

  public boolean isText()
  {
    return this.type.equals(TEXT);
  }

  public boolean isKeyword()
  {
    return this.type.equals(KEYWORD);
  }

  public boolean isKeyword(String keyword)
  {
    return type.equals(KEYWORD) && value.equals(keyword);
  }

  public boolean isOpenParenthesis()
  {
    return type.equals(OPEN_PARENTHESIS);
  }

  public boolean isCloseParenthesis()
  {
    return type.equals(CLOSE_PARENTHESIS);
  }

  public boolean isReference()
  {
    return type.equals(REFERENCE);
  }

  public boolean isComma()
  {
    return type.equals(COMMA);
  }

  public boolean isColon()
  {
    return type.equals(COLON);
  }

  public boolean isConstant()
  {
    return type.equals(CONSTANT);
  }

  public boolean isDollar()
  {
    return type.equals(DOLLAR);
  }

  public boolean isAsterisc()
  {
    return type.equals(ASTERISC);
  }

  public boolean isEOF()
  {
    return type.equals(EOF);
  }

  public boolean isEqual(String type, Object value)
  {
    if (!this.type.equals(type)) return false;
    if (this.value == null) return value == null;
    return this.value.equals(value);
  }

  @Override
  public String toString()
  {
    StringBuilder buffer = new StringBuilder();
    buffer.append("{").append(type);
    if (value != null)
    {
      buffer.append(" ").append(value);
    }
    buffer.append("}");
    return buffer.toString();
  }
}
