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
package org.bimrocket.dao.orient;

import java.io.OutputStream;
import java.io.Writer;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bimrocket.dao.expression.Expression;
import static org.bimrocket.dao.expression.Function.*;
import org.bimrocket.dao.expression.io.ExpressionPrinter;
import org.bimrocket.dao.expression.FunctionCall;
import org.bimrocket.dao.expression.Literal;
import org.bimrocket.dao.expression.Function;
import org.bimrocket.dao.expression.OrderByExpression;
import static org.bimrocket.dao.expression.OrderByExpression.DESC;
import org.bimrocket.dao.expression.Property;

/**
 *
 * @author realor
 */
public class OrientExpressionPrinter extends ExpressionPrinter
{
  public static final Map<Function, OrientOperator> operatorMap = new HashMap<>();
  public static final Map<Function, String> functionMap = new HashMap<>();
  public static final Map<Function, String> methodMap = new HashMap<>();

  static
  {
    registerOperator(OR, "or", 1);
    registerOperator(AND, "and", 2);
    registerOperator(EQ, "=", 3);
    registerOperator(NE, "<>", 3);
    registerOperator(LT, "<", 3);
    registerOperator(GT, ">", 3);
    registerOperator(LE, "<=", 3);
    registerOperator(GE, ">=", 3);
    registerOperator(ADD, "+", 4);
    registerOperator(SUB, "-", 4);
    registerOperator(MUL, "*", 5);
    registerOperator(DIV, "/", 5);
    registerOperator(MOD, "%", 5);
    registerOperator(NOT, "not", 6);
    registerOperator(NEG, "-", 6);

    registerOperator(CONTAINS, "like", 3, "'%' + ", " + '%'");
    registerOperator(STARTSWITH, "like", 3, null, " + '%'");
    registerOperator(ENDSWITH, "like", 3, "'%' + ", null);
    registerOperator(CONCAT, "+", 4);

    registerFunction(ROUND, "math_round");
    registerFunction(FLOOR, "math_floor");
    registerFunction(CEIL, "math_ceil");

    registerMethod(SUBSTRING, "substring");
    registerMethod(LENGTH, "length");
    registerMethod(TOLOWERCASE, "toLowerCase");
    registerMethod(TOUPPERCASE, "toUpperCase");
    registerMethod(TRIM, "trim");
    registerMethod(TOSTRING, "asString");
    registerMethod(TONUMBER, "asFloat");
    registerMethod(TOBOOLEAN, "asBoolean");
  }

  static void registerOperator(Function function, String name, int precedence)
  {
    operatorMap.put(function, new OrientOperator(name, precedence, null, null));
  }

  static void registerOperator(Function function, String name, int precedence, String prefix, String suffix)
  {
    operatorMap.put(function, new OrientOperator(name, precedence, prefix, suffix));
  }

  static void registerFunction(Function function, String name)
  {
    functionMap.put(function, name);
  }

  static void registerMethod(Function function, String name)
  {
    methodMap.put(function, name);
  }

  public OrientExpressionPrinter(OutputStream out)
  {
    super(out);
  }

  public OrientExpressionPrinter(Writer out)
  {
    super(out);
  }

  public static String toString(Expression expression)
  {
    return toString(expression, OrientExpressionPrinter.class);
  }

  public static String toString(List<OrderByExpression> orderBy)
  {
    return toString(orderBy, OrientExpressionPrinter.class);
  }

  @Override
  public void printExpression(Expression expression)
  {
    printExpression(expression, 0);
  }

  public void printExpression(Expression expression, int precedence)
  {
    if (expression instanceof FunctionCall)
    {
      FunctionCall functionCall = (FunctionCall)expression;
      Function function = functionCall.getFunction();
      List<Expression> arguments = functionCall.getArguments();
      if (operatorMap.containsKey(function))
      {
        OrientOperator operator = operatorMap.get(function);
        if (function.isSingleArgument())
        {
          print(operator.getName());
          print(" ");
          if (precedence > operator.getPrecedence()) print("(");
          printExpression(arguments.get(0), operator.getPrecedence());
          if (precedence > operator.getPrecedence()) print(")");
        }
        else
        {
          String operatorName = operator.getName();
          String prefix = operator.getPrefix();
          String suffix = operator.getSuffix();
          if (precedence > operator.getPrecedence()) print("(");
          printExpression(arguments.get(0), operator.getPrecedence());
          for (int i = 1; i < arguments.size(); i++)
          {
            print(' ');
            print(operatorName);
            print(' ');
            if (prefix != null) print(prefix);
            printExpression(arguments.get(i), operator.getPrecedence());
            if (suffix != null) print(suffix);
          }
          if (precedence > operator.getPrecedence()) print(")");
        }
      }
      else if (functionMap.containsKey(function))
      {
        print(functionMap.get(function));
        print('(');
        for (int i = 0; i < arguments.size(); i++)
        {
          if (i > 0) print(", ");
          printExpression(arguments.get(i), 0);
        }
        print(")");
      }
      else if (methodMap.containsKey(function))
      {
        // print as method invocation
        String methodName = methodMap.get(function);
        Expression argument = arguments.get(0);
        boolean isOperator = false;
        if (argument instanceof FunctionCall functionCallOp)
        {
          Function functionOp = functionCallOp.getFunction();
          isOperator = operatorMap.containsKey(functionOp);
        }
        if (isOperator)
        {
          // use the min function as a dummy function to be able to apply
          // the method on the expression
          print("min(");
          printExpression(argument, precedence);
          print(", null)");
        }
        else
        {
          printExpression(argument, precedence);
        }
        print('.');
        print(methodName);
        print('(');
        for (int i = 1; i < arguments.size(); i++)
        {
          if (i > 1) print(", ");
          printExpression(arguments.get(i), precedence);
        }
        print(")");
      }
      else throw new RuntimeException("Unsupported function " + function);
    }
    else if (expression instanceof Property)
    {
      Property property = (Property)expression;
      print(property.getName());
    }
    else if (expression instanceof Literal)
    {
      Literal literal = (Literal)expression;
      Object value = literal.getValue();
      if (value instanceof String)
      {
        print('\'');
        String text = (String)value;
        text = text.replace("'", "\\'");
        print(text);
        print('\'');
      }
      else if (value != null)
      {
        print(value.toString());
      }
      else
      {
        print("null");
      }
    }
  }

  @Override
  public void printExpression(OrderByExpression orderByExpression)
  {
    printExpression(orderByExpression.getExpression());
    if (orderByExpression.getDirection().equals(DESC))
    {
      print(" desc");
    }
  }

  @Override
  public void printExpression(List<OrderByExpression> orderBy)
  {
    if (orderBy.isEmpty()) return;
    printExpression(orderBy.get(0));
    for (int i = 1; i < orderBy.size(); i++)
    {
      print(", ");
      printExpression(orderBy.get(i));
    }
  }

  public static class OrientOperator
  {
    private final String name;
    private final int precedence;
    private final String prefix;
    private final String suffix;

    public OrientOperator(String name, int precedence, String prefix, String suffix)
    {
      this.name = name;
      this.precedence = precedence;
      this.prefix = prefix;
      this.suffix = suffix;
    }

    public String getName()
    {
      return name;
    }

    public int getPrecedence()
    {
      return precedence;
    }

    public String getPrefix()
    {
      return prefix;
    }

    public String getSuffix()
    {
      return suffix;
    }
  }
}
