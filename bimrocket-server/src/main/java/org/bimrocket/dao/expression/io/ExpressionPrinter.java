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
package org.bimrocket.dao.expression.io;

import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.lang.reflect.Constructor;
import java.util.List;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;

/**
 *
 * @author realor
 */
public abstract class ExpressionPrinter extends PrintWriter
{
  public ExpressionPrinter(OutputStream out)
  {
    super(out);
  }

  public ExpressionPrinter(Writer out)
  {
    super(out);
  }

  public static String toString(Expression expression,
    Class<? extends ExpressionPrinter> cls)
  {
    try
    {
      Constructor<? extends ExpressionPrinter> constructor =
        cls.getConstructor(Writer.class);

      StringWriter sw = new StringWriter();
      try (ExpressionPrinter printer = constructor.newInstance(sw))
      {
        printer.printExpression(expression);
      }
      return sw.toString();
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  public static String toString(List<OrderByExpression> orderBy,
    Class<? extends ExpressionPrinter> cls)
  {
    try
    {
      Constructor<? extends ExpressionPrinter> constructor =
        cls.getConstructor(Writer.class);

      StringWriter sw = new StringWriter();
      try (ExpressionPrinter printer = constructor.newInstance(sw))
      {
        printer.printExpression(orderBy);
      }
      return sw.toString();
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  public abstract void printExpression(Expression expression);

  public abstract void printExpression(List<OrderByExpression> orderByExpressions);

  public abstract void printExpression(OrderByExpression orderByExpression);
}
