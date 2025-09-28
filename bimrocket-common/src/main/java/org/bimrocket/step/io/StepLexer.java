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

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.HashMap;
import java.util.Stack;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.bimrocket.express.ExpressConstant;
import static org.bimrocket.step.io.StepToken.*;

/**
 *
 * @author realor
 */
public class StepLexer
{
  private final Reader reader;
  private final Stack<StepToken> tokenStack = new Stack<>();
  private final Stack<Integer> charStack = new Stack<>();
  private final StringBuilder buffer = new StringBuilder();

  private static final LookupTable KEYWORDS = new LookupTable();
  private static final Pattern TEXT_PATTERN =
    Pattern.compile("\\\\X2\\\\[\\dA-F]{4}\\\\X0\\\\|\\\\X\\\\[\\dA-F]{2}");

  static
  {
    KEYWORDS.add("ISO-10303-21");
    KEYWORDS.add("HEADER");
    KEYWORDS.add("DATA");
    KEYWORDS.add("ENDSEC");
    KEYWORDS.add("END-ISO-10303-21");
  }

  public StepLexer(Reader reader)
  {
    this.reader = reader;
  }

  public StepToken readToken() throws IOException
  {
    StepToken token;
    buffer.setLength(0);

    if (tokenStack.isEmpty())
    {
      int ch = read();
      while (ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n')
      {
        ch = read();
      }

      switch (ch)
      {
        case -1:
          token = EOF_TOKEN;
          break;
        case '=':
          token = EQUAL_TOKEN;
          break;
        case ',':
          token = COMMA_TOKEN;
          break;
        case ';':
          token = COLON_TOKEN;
          break;
        case '(':
          token = OPEN_PARENTHESIS_TOKEN;
          break;
        case ')':
          token = CLOSE_PARENTHESIS_TOKEN;
          break;
        case '*':
          token = ASTERISC_TOKEN;
          break;
        case '$':
          token = DOLLAR_TOKEN;
          break;
        case '\'':
          token = readText();
          break;
        case '/':
          token = readComment();
          break;
        case '#':
          token = readReference();
          break;
        default:
          if (Character.isDigit(ch) || ch == '-')
          {
            token = readNumber(ch);
          }
          else if (Character.isLetter(ch) || ch == '_')
          {
            token = readKeywordOrIdentifier(ch);
          }
          else if (ch == '.')
          {
            token = readConstant();
          }
          else
          {
            token = new StepToken(INVALID, String.valueOf((char)ch));
          }
          break;
      }
    }
    else
    {
      token = tokenStack.pop();
    }
    return token;
  }

  public void unreadToken(StepToken token)
  {
    tokenStack.push(token);
  }

  protected StepToken readText() throws IOException
  {
    boolean decode = false;
    int ch = read();
    while (ch != -1)
    {
      if (ch == '\'')
      {
        int ch2 = read();
        if (ch2 == '\'')
        {
          buffer.append('\'');
        }
        else
        {
          unread(ch2);
          break;
        }
      }
      else
      {
        buffer.append((char)ch);
        if ((char)ch == '\\') decode = true;
      }
      ch = read();
    }

    if (!decode) return new StepToken(TEXT, buffer.toString());

    Matcher matcher = TEXT_PATTERN.matcher(buffer.toString());
    StringBuffer sb = new StringBuffer();
    while (matcher.find())
    {
      String group = matcher.group();
      String code = (group.length() == 12) ?
        group.substring(4, 8) : group.substring(3, 5);
      matcher.appendReplacement(sb,
        String.valueOf((char)Integer.parseInt(code, 16)));
    }
    matcher.appendTail(sb);

    return new StepToken(TEXT, sb.toString());
  }

  protected StepToken readNumber(int ch) throws IOException
  {
    buffer.append((char)ch);
    ch = read();
    while (Character.isDigit(ch)) // read integer part
    {
      buffer.append((char)ch);
      ch = read();
    }
    boolean decimal = false;
    if (ch == '.') // read decimal part
    {
      decimal = true;
      buffer.append('.');
      ch = read();
      while (Character.isDigit(ch))
      {
        buffer.append((char)ch);
        ch = read();
      }
    }
    if (ch == 'E') // read exponent part
    {
      decimal = true;
      buffer.append('E');
      ch = read();
      if (ch == '-')
      {
        buffer.append('-');
        ch = read();
      }
      while (Character.isDigit(ch))
      {
        buffer.append((char)ch);
        ch = read();
      }
    }
    unread(ch);
    String value = buffer.toString();
    StepToken token;
    try
    {
      if (decimal)
      {
        double number = Double.parseDouble(value);
        token = new StepToken(NUMBER, number);
      }
      else
      {
        long number = Long.parseLong(value);
        token = new StepToken(NUMBER, number);
      }
    }
    catch (NumberFormatException ex)
    {
      token = new StepToken(INVALID, value);
    }
    return token;
  }

  protected StepToken readKeywordOrIdentifier(int ch) throws IOException
  {
    buffer.append((char)ch);
    ch = read();
    while (Character.isLetterOrDigit(ch) || ch == '_' || ch == '-')
    {
      buffer.append((char)ch);
      ch = read();
    }
    unread(ch);
    String value = buffer.toString();
    String keyword = KEYWORDS.get(value);
    if (keyword == null)
    {
      return new StepToken(IDENTIFIER, value);
    }
    else
    {
      return new StepToken(KEYWORD, keyword);
    }
  }

  protected StepToken readConstant() throws IOException
  {
    int ch = read();
    while (Character.isLetterOrDigit(ch) || ch == '_')
    {
      buffer.append((char)ch);
      ch = read();
    }
    StepToken token;
    if (ch == '.')
    {
      String value = buffer.toString();
      token = new StepToken(CONSTANT, new ExpressConstant(value));
    }
    else
    {
      unread(ch);
      String value = buffer.toString();
      token = new StepToken(INVALID, value);
    }
    return token;
  }

  protected StepToken readReference() throws IOException
  {
    buffer.append("#");
    int ch = read();
    while (Character.isDigit(ch))
    {
      buffer.append((char)ch);
      ch = read();
    }
    unread(ch);
    return new StepToken(REFERENCE, buffer.toString());
  }

  protected StepToken readComment() throws IOException
  {
    StepToken token;
    int ch2 = read();
    if (ch2 == '*')
    {
      // inside comment /* ...
      int ch = read();
      ch2 = read();
      while ((ch != '*' || ch2 != '/') && ch2 != -1)
      {
        buffer.append((char)ch);
        ch = ch2;
        ch2 = read();
      }
      token = new StepToken(COMMENT, buffer.toString());
    }
    else
    {
      unread(ch2);
      token = new StepToken(INVALID, "/");
    }
    return token;
  }

  protected int read() throws IOException
  {
    int ch;
    if (charStack.isEmpty())
    {
      ch = reader.read();
    }
    else
    {
      ch = charStack.pop();
    }
    return ch;
  }

  protected void unread(int ch)
  {
    charStack.push(ch);
  }

  static class LookupTable extends HashMap<String, String>
  {
    private static final long serialVersionUID = 1L;

    public void add(String value)
    {
      put(value, value);
    }
  }

  public static void main(String[] args) throws IOException
  {
    //String filename = "/home/realor/Documentos/work/IFC/models/OTHERS/AC20-FZK-Haus.ifc";
    String filename = "/home/realor/Documentos/work/IFC/models/ROS/ROS_ARC.ifc";
    //String filename = "/home/realor/Documentos/work/IFC/models/OTHERS/VW2016-IFC2x3-EQUA_IDA_ICE.ifc";

    BufferedReader reader = new BufferedReader(new InputStreamReader(
      new FileInputStream(filename)));
    try
    {
      StepLexer lexer = new StepLexer(reader);
      StepToken token = lexer.readToken();
      while (!token.isEOF())
      {
        if (token.isNumber()) System.out.println(token);
        token = lexer.readToken();
      }
    }
    finally
    {
      reader.close();
    }
  }
}
