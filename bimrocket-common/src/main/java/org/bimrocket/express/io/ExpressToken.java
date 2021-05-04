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

package org.bimrocket.express.io;

/**
 *
 * @author realor
 */
public class ExpressToken
{
  public static final String KEYWORD = "KEYWORD";
  public static final String IDENTIFIER = "IDENTIFIER";
  public static final String TEXT = "TEXT";
  public static final String NUMBER = "NUMBER";
  public static final String SYMBOL = "SYMBOL";
  public static final String OPERATOR = "OPERATOR";
  public static final String COMMENT = "COMMENT";
  public static final String EOF = "EOF";
  public static final String INVALID = "INVALID";
  
  private final String type;
  private final Object value;

  public ExpressToken(String type)
  {
    this.type = type;
    this.value = null;
  }
  
  public ExpressToken(String type, Object value)
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
  
  public boolean isKeyword()
  {
    return this.type.equals(KEYWORD);
  }
  
  public boolean isKeyword(String keyword)
  {
    return type.equals(KEYWORD) && value.equals(keyword);
  }

  public boolean isOperator(String operator)
  {
    return type.equals(OPERATOR) && value.equals(operator);
  }

  public boolean isSymbol(String symbol)
  {
    return type.equals(SYMBOL) && value.equals(symbol);
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
