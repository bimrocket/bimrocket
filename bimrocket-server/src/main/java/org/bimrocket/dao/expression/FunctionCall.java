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
package org.bimrocket.dao.expression;

import java.util.ArrayList;
import java.util.List;
import static org.bimrocket.dao.expression.Expression.ANY;
import org.bimrocket.dao.expression.Function.Argument;

/**
 *
 * @author realor
 */
public class FunctionCall extends Expression
{
  Function function;
  List<Expression> arguments = new ArgumentList();

  public FunctionCall(Function function, Expression ...arguments)
  {
    this.function = function;
    for (Expression argument : arguments)
    {
      this.arguments.add(argument);
    }
  }

  public Function getFunction()
  {
    return function;
  }

  public List<Expression> getArguments()
  {
    return arguments;
  }

  @Override
  public String getType()
  {
    return function.getType();
  }

  public class ArgumentList extends ArrayList<Expression>
  {
    private static final long serialVersionUID = 1L;

    @Override
    public boolean add(Expression expression)
    {
      if (expression == null) throw new RuntimeException("null expression");

      int index = size();
      String type = expression.getType();
      Argument argument = function.getArgument(index);
      if (argument == null)
        throw new RuntimeException("Unexpected argument at index " + size() +
          " in " + function.getName());

      if (!ANY.equals(type) &&
          !ANY.equals(argument.getType()) &&
          !type.equals(argument.getType()))
        throw new RuntimeException("The type of argument at index " + size() + " of " +
          function.getName() + " must be " + argument.getType() + " instead of " + type);

      return super.add(expression);
    }
  }
}
