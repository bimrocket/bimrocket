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
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bimrocket.dao.expression.Expression;
import static org.bimrocket.dao.expression.Expression.ANY;
import static org.bimrocket.dao.expression.Expression.BOOLEAN;
import static org.bimrocket.dao.expression.Expression.NUMBER;
import static org.bimrocket.dao.expression.Expression.STRING;
import org.bimrocket.dao.expression.Function;
import org.bimrocket.dao.expression.FunctionCall;
import org.bimrocket.dao.expression.Literal;
import org.bimrocket.dao.expression.Property;
import org.bimrocket.dao.expression.OrderByExpression;
import static org.bimrocket.dao.expression.Function.*;
import static org.bimrocket.dao.expression.OrderByExpression.ASC;
import static org.bimrocket.dao.expression.OrderByExpression.DESC;
import org.bimrocket.dao.expression.io.ExpressionParser;
import static org.bimrocket.dao.expression.io.odata.ODataToken.ASC_TOKEN;
import static org.bimrocket.dao.expression.io.odata.ODataToken.DESC_TOKEN;
import org.bimrocket.exception.ParseException;

/**
 *
 * @author realor
 */
public class ODataParser extends ExpressionParser
{
  public static final Map<String, ODataOperator> operatorMap = new HashMap<>();
  public static final Map<String, Function> functionMap = new HashMap<>();
  final Map<String, Field> fieldMap;
  private ODataTokenizer tokenizer;

  static final Function CAST = define("cast", ANY)
    .argument("value", ANY)
    .argument("type", STRING)
    .build();

  static
  {
    registerOperator("or", OR, 1);
    registerOperator("and", AND, 2);
    registerOperator("eq", EQ, 3);
    registerOperator("ne", NE, 3);
    registerOperator("lt", LT, 3);
    registerOperator("gt", GT, 3);
    registerOperator("le", LE, 3);
    registerOperator("ge", GE, 3);
    registerOperator("add", ADD, 4);
    registerOperator("sub", SUB, 4);
    registerOperator("mul", MUL, 5);
    registerOperator("div", DIV, 5);
    registerOperator("mod", MOD, 5);
    registerOperator("not", NOT, 6);
    registerOperator("-", NEG, 6);

    registerFunction("round", ROUND);
    registerFunction("floor", FLOOR);
    registerFunction("ceiling", CEIL);
    registerFunction("contains", CONTAINS);
    registerFunction("substring", SUBSTRING);
    registerFunction("startswith", STARTSWITH);
    registerFunction("endswith", ENDSWITH);
    registerFunction("length", LENGTH);
    registerFunction("tolower", TOLOWERCASE);
    registerFunction("toupper", TOUPPERCASE);
    registerFunction("trim", TRIM);
    registerFunction("concat", CONCAT);
    registerFunction("cast", CAST);
  }

  static void registerOperator(String name, Function function, int precedence)
  {
    ODataOperator operator = new ODataOperator(name, function, precedence);
    operatorMap.put(name, operator);
  }

  static void registerFunction(String name, Function function)
  {
    functionMap.put(name, function);
  }

  public ODataParser(Map<String, Field> fieldMap)
  {
    this.fieldMap = fieldMap;
  }

  @Override
  public Expression parseFilter(Reader filter) throws IOException
  {
    tokenizer = new ODataTokenizer(filter, operatorMap, functionMap);
    Expression expression = parseExpression(0);

    ODataToken token = tokenizer.readToken();
    if (!token.isEOF())
      throw createException("Unexcepted token " + token);

    if (!expression.getType().equals(BOOLEAN))
      throw new RuntimeException("Not a boolean expression");

    return expression;
  }

  @Override
  public List<OrderByExpression> parseOrderBy(Reader orderBy)
    throws IOException
  {
    List<OrderByExpression> orderByExpressions = new ArrayList<>();
    tokenizer = new ODataTokenizer(orderBy, operatorMap, functionMap);

    Expression expression = parseExpression(0);
    while (expression != null)
    {
      ODataToken token = tokenizer.readToken();
      if (token.isComma() || token.isEOF())
      {
        orderByExpressions.add(new OrderByExpression(expression));
      }
      else
      {
        if (token.equals(ASC_TOKEN))
        {
          orderByExpressions.add(new OrderByExpression(expression, ASC));
        }
        else if (token.equals(DESC_TOKEN))
        {
          orderByExpressions.add(new OrderByExpression(expression, DESC));
        }
        else throw createException("Unexpected token " + token);

        token = tokenizer.readToken(); // read comma or eof
      }

      if (token.isEOF())
      {
        expression = null;
      }
      else if (token.isComma())
      {
        expression = parseExpression(0);
        if (expression == null) throw createException("Expression expected");
      }
      else throw createException("Unexpected token " + token);
    }
    return orderByExpressions;
  }

  private Expression parseExpression(int precedence) throws IOException
  {
    ODataToken token = tokenizer.readToken();

    if (token.isEOF())
    {
      return null;
    }
    else if (token.isLiteral())
    {
      Literal literal = Literal.valueOf(token.getValue());
      return parseRightExpression(literal, precedence);
    }
    else if (token.isProperty())
    {
      String name = token.getText();
      Field field = fieldMap.get(name);
      if (field == null)
        throw createException("Invalid property " + name);

      Property property = new Property(field.getName(), getFieldType(field));
      return parseRightExpression(property, precedence);
    }
    else if (token.isFunction())
    {
      FunctionCall functionCall =
        new FunctionCall((Function)token.getValue());

      if (!tokenizer.readToken().isOpenParenthesis())
        throw createException("Expected open parenthesis");

      Expression argument = parseExpression(precedence);
      functionCall.getArguments().add(argument);
      token = tokenizer.readToken();
      while (token.isComma())
      {
        argument = parseExpression(precedence);
        functionCall.getArguments().add(argument);
        token = tokenizer.readToken();
      }
      if (!token.isCloseParenthesis())
        throw createException("Expected close parenthesis");

      return parseRightExpression(transform(functionCall), precedence);
    }
    else if (token.isOperator())
    {
      ODataOperator operator = (ODataOperator)token.getValue();
      if (!operator.isUnary())
        throw createException("Unexpected operator " + operator.getName());

      Expression operand = parseExpression(precedence);
      return new FunctionCall(operator.getFunction(), operand);
    }
    else if (token.isOpenParenthesis()) // grouping
    {
      Expression nested = parseExpression(0);
      if (!tokenizer.readToken().isCloseParenthesis())
        throw createException("Expected close parenthesis");
      return parseRightExpression(nested, precedence);
    }
    throw createException("Unexpected token " + token);
  }

  private Expression parseRightExpression(Expression leftExpression,
    int precedence) throws IOException
  {
    ODataOperator lastOperator = null;

    ODataToken token = tokenizer.readToken();

    while (token.isOperator())
    {
      ODataOperator operator = (ODataOperator)token.getValue();
      if (operator.isUnary())
        throw createException("Unexpected token " + token);

      if (operator.getPrecedence() > precedence)
      {
        Expression rightExpression = parseExpression(operator.getPrecedence());
        if (rightExpression == null)
          throw createException("Expected expression");
        if (operator.equals(lastOperator) && operator.isChainable())
        {
          ((FunctionCall)leftExpression).getArguments().add(rightExpression);
        }
        else
        {
          leftExpression = new FunctionCall(operator.getFunction(),
            leftExpression, rightExpression);
          lastOperator = operator;
        }
        token = tokenizer.readToken();
      }
      else break;
    }
    tokenizer.unreadToken(token);
    return leftExpression;
  }

  private FunctionCall transform(FunctionCall functionCall)
  {
    Function function = functionCall.getFunction();
    List<Expression> arguments = functionCall.getArguments();

    if (function.equals(SUBSTRING))
    {
      if (arguments.size() >= 3)
      {
        FunctionCall add = new FunctionCall(ADD, arguments.get(1), arguments.get(2));
        arguments.set(2, add);
      }
    }
    else if (function.equals(CAST))
    {
      if (arguments.size() < 2)
        throw createException("Insufficient arguments in cast function");

      Expression argExpr = arguments.get(1);
      if (!(argExpr instanceof Literal))
        throw createException("type argument in cast function must be a literal");

      String argType = ((Literal)argExpr).getValue().toString();

      if ("Number".equalsIgnoreCase(argType) ||
          "Edm.Int16".equalsIgnoreCase(argType) ||
          "Edm.Int32".equalsIgnoreCase(argType) ||
          "Edm.Int64".equalsIgnoreCase(argType) ||
          "Edm.Single".equalsIgnoreCase(argType) ||
          "Edm.Double".equalsIgnoreCase(argType) ||
          "Edm.Decimal".equalsIgnoreCase(argType))
      {
        functionCall = new FunctionCall(TONUMBER, arguments.get(0));
      }
      else if ("Boolean".equalsIgnoreCase(argType) ||
               "Edm.Boolean".equalsIgnoreCase(argType))
      {
        functionCall = new FunctionCall(TOBOOLEAN, arguments.get(0));
      }
      else
      {
        functionCall = new FunctionCall(TOSTRING, arguments.get(0));
      }
    }
    return functionCall;
  }

  private String getFieldType(Field field)
  {
    Class<?> cls = field.getType();
    if (cls.equals(String.class)) return STRING;
    else if (Number.class.isAssignableFrom(cls)) return NUMBER;
    else if (Boolean.class.isAssignableFrom(cls)) return BOOLEAN;
    return ANY;
  }

  private ParseException createException(String message)
  {
    return new ParseException(message, tokenizer.getOffset());
  }
}
