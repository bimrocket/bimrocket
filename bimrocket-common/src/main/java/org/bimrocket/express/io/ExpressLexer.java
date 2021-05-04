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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.HashMap;
import java.util.Stack;
import static org.bimrocket.express.io.ExpressToken.*;
import static org.bimrocket.step.io.StepToken.TEXT;

/**
 *
 * @author realor
 */
public class ExpressLexer
{
  private static final LookupTable KEYWORDS = new LookupTable();
  private static final String OPERATORS = "+-*/=<>|:";

  private final Reader reader;
  private final Stack<ExpressToken> tokenStack = new Stack<>();
  private final Stack<Integer> charStack = new Stack<>();
  private final StringBuilder buffer = new StringBuilder();

  static
  {
    KEYWORDS.add("SCHEMA");
    KEYWORDS.add("END_SCHEMA");
    KEYWORDS.add("ENTITY");
    KEYWORDS.add("END_ENTITY");
    KEYWORDS.add("TYPE");
    KEYWORDS.add("END_TYPE");
    KEYWORDS.add("IF");
    KEYWORDS.add("THEN");
    KEYWORDS.add("ELSE");
    KEYWORDS.add("END_IF");
    KEYWORDS.add("REPEAT");
    KEYWORDS.add("END_REPEAT");
    KEYWORDS.add("FUNCTION");
    KEYWORDS.add("END_FUNCTION");
    KEYWORDS.add("LOCAL");
    KEYWORDS.add("END_LOCAL");
    KEYWORDS.add("RULE");
    KEYWORDS.add("END_RULE");
    KEYWORDS.add("BEGIN");
    KEYWORDS.add("LIST");
    KEYWORDS.add("SET");
    KEYWORDS.add("ARRAY");
    KEYWORDS.add("OF");
    KEYWORDS.add("SUPERTYPE");
    KEYWORDS.add("SUBTYPE");
    KEYWORDS.add("OPTIONAL");
    KEYWORDS.add("EXISTS");
    KEYWORDS.add("SELF");
    KEYWORDS.add("AND");
    KEYWORDS.add("OR");
    KEYWORDS.add("NOT");
    KEYWORDS.add("ABSTRACT");
    KEYWORDS.add("IN");
    KEYWORDS.add("QUERY");
    KEYWORDS.add("STRING");
    KEYWORDS.add("LOGICAL");
    KEYWORDS.add("BOOLEAN");
    KEYWORDS.add("REAL");
    KEYWORDS.add("INTEGER");
    KEYWORDS.add("BINARY");
    KEYWORDS.add("NUMBER");
    KEYWORDS.add("WHERE");
    KEYWORDS.add("FOR");
    KEYWORDS.add("FALSE");
    KEYWORDS.add("TRUE");
    KEYWORDS.add("ESCAPE");
    KEYWORDS.add("TO");
    KEYWORDS.add("CASE");
    KEYWORDS.add("RETURN");
    KEYWORDS.add("ONEOF");
    KEYWORDS.add("SELECT");
    KEYWORDS.add("ENUMERATION");
    KEYWORDS.add("SIZEOF");
    KEYWORDS.add("TYPEOF");
    KEYWORDS.add("INVERSE");
    KEYWORDS.add("DERIVE");
    KEYWORDS.add("UNIQUE");
  }

  public ExpressLexer(Reader reader)
  {
    this.reader = reader;
  }

  public ExpressToken readToken() throws IOException
  {
    ExpressToken token;
    buffer.setLength(0);

    if (tokenStack.isEmpty())
    {
      int ch = read();
      while (ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n')
      {
        ch = read();
      }

      if (ch == -1)
      {
        token = new ExpressToken(EOF);
      }
      else if (ch == '\'')
      {
        token = readText();
      }
      else if (Character.isDigit((char)ch))
      {
        token = readNumber(ch);
      }
      else if (Character.isLetter((char)ch) || ch == '_')
      {
        token = readKeywordOrIdentifier(ch);
      }
      else if (ch == '(')
      {
        int ch2 = read();
        if (ch2 == '*')
        {
          token = readComment();
        }
        else
        {
          unread(ch2);
          token = new ExpressToken(SYMBOL, "(");
        }
      }
      else if (OPERATORS.indexOf((char)ch) != -1)
      {
        token = readOperator(ch);
      }
      else
      {
        token = new ExpressToken(SYMBOL, String.valueOf((char)ch));
      }
    }
    else
    {
      token = tokenStack.pop();
    }
    return token;
  }

  public void unreadToken(ExpressToken token)
  {
    tokenStack.push(token);
  }

  protected ExpressToken readText() throws IOException
  {
    int ch = read();
    while (ch != '\'' && ch != -1)
    {
      buffer.append((char)ch);
      ch = read();
    }
    return new ExpressToken(TEXT, buffer.toString());    
  }
  
  protected ExpressToken readNumber(int ch) throws IOException
  {
    buffer.append((char)ch);
    ch = read();
    while (Character.isDigit((char)ch) || ch == '.')
    {
      buffer.append((char)ch);
      ch = read();
    }
    unread(ch);
    String value = buffer.toString();
    try
    {
      double number = Double.parseDouble(value);
      return new ExpressToken(NUMBER, number);
    }
    catch (NumberFormatException ex)
    {
      return new ExpressToken(INVALID, value);
    }
  }
  
  protected ExpressToken readKeywordOrIdentifier(int ch) throws IOException
  {
    buffer.append((char)ch);
    ch = read();
    while (Character.isLetterOrDigit((char)ch) || ch == '_')
    {
      buffer.append((char)ch);
      ch = read();
    }
    unread(ch);
    String value = buffer.toString();
    String keyword = KEYWORDS.get(value);
    if (keyword == null)
    {
      return new ExpressToken(IDENTIFIER, value);
    }
    else
    {      
      return new ExpressToken(KEYWORD, keyword);
    }
  }
  
  protected ExpressToken readComment() throws IOException
  {
    // inside comment (* ...
    int ch = read();
    int ch2 = read();
    while ((ch != '*' || ch2 != ')') && ch2 != -1)
    {
      buffer.append((char)ch);
      ch = ch2;
      ch2 = read();
    }
    return new ExpressToken(COMMENT, buffer.toString());
  }
  
  protected ExpressToken readOperator(int ch) throws IOException
  {
    buffer.append((char)ch);
    ch = read();
    while (OPERATORS.indexOf(ch) != -1)
    {
      buffer.append((char)ch);
      ch = read();
    }
    unread(ch);
    return new ExpressToken(OPERATOR, buffer.toString());    
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
    public void add(String value)
    {
      put(value, value);
    }    
  }

  public static void main(String[] args) throws IOException
  {
    InputStream is = ExpressLexer.class.getResourceAsStream(
      "/org/ifcserver/schema/IFC4.exp");
    BufferedReader reader = new BufferedReader(new InputStreamReader(is));
    try
    {
      ExpressLexer lexer = new ExpressLexer(reader);
      ExpressToken token = lexer.readToken();
      while (!token.isEOF())
      {
        System.out.println(token);
        token = lexer.readToken();
      }
    }
    finally
    {
      reader.close();
    }
  }
}
