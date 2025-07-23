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
package org.bimrocket.dao.expression.io.log;

import org.bimrocket.dao.expression.io.ExpressionPrinter;
import java.io.OutputStream;
import java.io.Writer;
import java.util.List;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.FunctionCall;
import org.bimrocket.dao.expression.Literal;
import org.bimrocket.dao.expression.OrderByExpression;
import static org.bimrocket.dao.expression.OrderByExpression.DESC;
import org.bimrocket.dao.expression.Property;

/**
 *
 * @author realor
 */
public class LogExpressionPrinter extends ExpressionPrinter
{
  public LogExpressionPrinter(OutputStream out)
  {
    super(out);
  }

  public LogExpressionPrinter(Writer out)
  {
    super(out);
  }

  public static String toString(Expression expression)
  {
    return toString(expression, LogExpressionPrinter.class);
  }

  public static String toString(List<OrderByExpression> orderBy)
  {
    return toString(orderBy, LogExpressionPrinter.class);
  }

  @Override
  public void printExpression(Expression expression)
  {
    if (expression instanceof FunctionCall)
    {
      print("(");
      FunctionCall functionCall = (FunctionCall)expression;
      print(functionCall.getFunction().getName());
      List<Expression> arguments = functionCall.getArguments();
      for (int i = 0; i < arguments.size(); i++)
      {
        print(" ");
        printExpression(arguments.get(i));
      }
      print(")");
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
    print("(");
    if (orderByExpression.getDirection().equals(DESC))
    {
      print("desc");
    }
    else
    {
      print("asc");
    }
    print(" ");
    printExpression(orderByExpression.getExpression());
    print(")");
  }

  @Override
  public void printExpression(List<OrderByExpression> orderBy)
  {
    if (orderBy.isEmpty()) return;
    print("(");
    printExpression(orderBy.get(0));
    for (int i = 1; i < orderBy.size(); i++)
    {
      print(" ");
      printExpression(orderBy.get(i));
    }
    print(")");
  }
}
