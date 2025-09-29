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

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import static java.lang.Character.isDigit;
import static java.lang.Character.isLetter;
import java.util.Map;
import java.util.Stack;
import org.bimrocket.dao.expression.Function;
import static org.bimrocket.dao.expression.io.odata.ODataToken.*;
import org.bimrocket.exception.ParseException;

/**
 *
 * @author realor
 */
public class ODataTokenizer
{
  Reader reader;
  int offset = 0;
  Stack<Character> unreadCharStack = new Stack<>();
  Stack<ODataToken> unreadTokenStack = new Stack<>();
  StringBuilder buffer = new StringBuilder();
  Map<String, ODataOperator> operatorMap;
  Map<String, Function> functionMap;

  public ODataTokenizer(String odata,
    Map<String, ODataOperator> operatorMap, Map<String, Function> functionMap)
  {
    this(new StringReader(odata), operatorMap, functionMap);
  }

  public ODataTokenizer(Reader reader,
    Map<String, ODataOperator> operatorMap, Map<String, Function> functionMap)
  {
    this.reader = reader;
    this.operatorMap = operatorMap;
    this.functionMap = functionMap;
  }

  public ODataToken readToken() throws IOException
  {
    if (!unreadTokenStack.isEmpty()) return unreadTokenStack.pop();

    char ch = read();
    while (ch == ' ') ch = read();

    if (ch == (char)-1)
    {
      return EOF_TOKEN;
    }
    else if (ch == '(')
    {
      return OPEN_TOKEN;
    }
    else if (ch == ')')
    {
      return CLOSE_TOKEN;
    }
    else if (ch == ',')
    {
      return COMMA_TOKEN;
    }
    else if (ch == '\'')
    {
      return readString();
    }
    else if (isDigit(ch) || ch == '-' || ch == '.')
    {
      return readNumber(ch);
    }
    else if (isLetter(ch) || ch == '_' || ch == '$')
    {
      return readWord(ch);
    }
    else
    {
      throw createException("Invalid token " + ch);
    }
  }

  public void unreadToken(ODataToken token)
  {
    unreadTokenStack.push(token);
  }

  public int getOffset()
  {
    return offset;
  }

  private ODataToken readString() throws IOException
  {
    String text = null;
    buffer.setLength(0);
    char ch = read();
    while (ch != (char)-1)
    {
      if (ch == '\'')
      {
        ch = read();
        if (ch == '\'') // quote '' => '
        {
          buffer.append(ch);
          ch = read();
        }
        else // end of string
        {
          text = buffer.toString();
          unread(ch);
          break;
        }
      }
      else
      {
        buffer.append(ch);
        ch = read();
      }
    }
    if (text == null) throw createException("Unterminated string");
    return new ODataToken(STRING, text, text);
  }

  private ODataToken readNumber(char ch) throws IOException
  {
    boolean isDouble = false;
    int mantissa = 0;
    buffer.setLength(0);
    if (ch != '.') // integer part
    {
      buffer.append(ch);
      ch = read();
      while (isDigit(ch))
      {
        mantissa++;
        buffer.append(ch);
        ch = read();
      }
    }
    if (ch == '.') // decimal part
    {
      isDouble = true;
      buffer.append('.');
      ch = read();
      while (isDigit(ch))
      {
        mantissa++;
        buffer.append(ch);
        ch = read();
      }
    }
    if (ch == 'e' || ch == 'E') // exponent part
    {
      if (mantissa == 0) throw createException(buffer.toString() + ch);

      isDouble = true;
      buffer.append(ch);
      ch = read();
      if (ch == '+' || ch == '-')
      {
        buffer.append(ch);
        ch = read();
      }
      while (isDigit(ch))
      {
        buffer.append(ch);
        ch = read();
      }
    }
    unread(ch);

    String text = buffer.toString();

    if (text.equals("-"))
      return new ODataToken(OPERATOR, "-", operatorMap.get("-"));

    if ("(), ".indexOf(ch) == -1 && ch != (char)-1)
      throw createException("Invalid number " + text + ch);

    Object value;
    if (isDouble)
    {
      value = Double.valueOf(text);
    }
    else
    {
      value = Integer.valueOf(text);
    }
    return new ODataToken(NUMBER, text, value);
  }

  private ODataToken readWord(char ch) throws IOException
  {
    buffer.setLength(0);
    buffer.append(ch);
    ch = read();
    while (isLetter(ch) || isDigit(ch) || ch == '_' || ch == '$')
    {
      buffer.append(ch);
      ch = read();
    }
    unread(ch);

    String text = buffer.toString();
    switch (text)
    {
      case "true":
        return TRUE_TOKEN;
      case "false":
        return FALSE_TOKEN;
      case "null":
        return NULL_TOKEN;
      case "asc":
        return ASC_TOKEN;
      case "desc":
        return DESC_TOKEN;
      default:
        if (operatorMap.containsKey(text))
        {
          return new ODataToken(OPERATOR, text, operatorMap.get(text));
        }
        else if (functionMap.containsKey(text))
        {
          return new ODataToken(FUNCTION, text, functionMap.get(text));
        }
        else
        {
          return new ODataToken(PROPERTY, text, text);
        }
    }
  }

  private ParseException createException(String message)
  {
    return new ParseException(message, offset);
  }

  private char read() throws IOException
  {
    char ch;
    if (unreadCharStack.isEmpty())
    {
      ch = (char)reader.read();
    }
    else
    {
      ch = unreadCharStack.pop();
    }
    if (ch != (char)-1) offset++;
    return ch;
  }

  private void unread(char ch)
  {
    unreadCharStack.push(ch);
    if (ch != (char)-1) offset--;
  }
}
