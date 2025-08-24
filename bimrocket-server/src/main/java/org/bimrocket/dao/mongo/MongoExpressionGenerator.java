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
package org.bimrocket.dao.mongo;

import static com.mongodb.client.model.Sorts.descending;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bimrocket.dao.expression.Expression;
import static org.bimrocket.dao.expression.Expression.fn;
import static org.bimrocket.dao.expression.Expression.property;
import org.bimrocket.dao.expression.Function;
import static org.bimrocket.dao.expression.Function.*;
import org.bimrocket.dao.expression.FunctionCall;
import org.bimrocket.dao.expression.Literal;
import org.bimrocket.dao.expression.OrderByExpression;
import static org.bimrocket.dao.expression.OrderByExpression.DESC;
import org.bimrocket.dao.expression.Property;
import org.bson.Document;

/**
 *
 * @author realor
 */
public class MongoExpressionGenerator
{
  public static final Map<Function, String> functionMap = new HashMap<>();

  static
  {
    // logical functions
    registerFunction(OR, "$or");
    registerFunction(AND, "$and");
    registerFunction(NOT, "$not");

    // comparison functions
    registerFunction(EQ, "$eq");
    registerFunction(NE, "$ne");
    registerFunction(LT, "$lt");
    registerFunction(GT, "$gt");
    registerFunction(LE, "$lte");
    registerFunction(GE, "$gte");

    // math functions
    registerFunction(ADD, "$add");
    registerFunction(SUB, "$subtract");
    registerFunction(MUL, "$multiply");
    registerFunction(DIV, "$divide");
    registerFunction(MOD, "$mod");
    registerFunction(NEG, "#neg");
    registerFunction(ROUND, "$round");
    registerFunction(FLOOR, "$floor");
    registerFunction(CEIL, "$ceil");

    // string functions
    registerFunction(CONTAINS, "#contains");
    registerFunction(STARTSWITH, "#startsWith");
    registerFunction(ENDSWITH, "#endsWith");
    registerFunction(CONCAT, "$concat");
    registerFunction(SUBSTRING, "#substring");
    registerFunction(LENGTH, "$strLenCP");
    registerFunction(TOLOWERCASE, "$toLower");
    registerFunction(TOUPPERCASE, "$toUpper");
    registerFunction(TRIM, "$trim");

    // conversion functions
    registerFunction(TOSTRING, "$toString");
    registerFunction(TONUMBER, "$toDouble");
    registerFunction(TOBOOLEAN, "$toBool");
  }

  static void registerFunction(Function function, String name)
  {
    functionMap.put(function, name);
  }

  public Document generateFilter(Expression filter)
  {
    return new Document("$expr", generateExpression(filter));
  }

  public List<Document> generateAggregate(Expression filter,
    List<OrderByExpression> orderByList)
  {
    // generates mongodb aggregate bson
    Document match = null;
    Document addFields = null;
    Document sort = null;

    if (filter != null)
    {
      Object filterExpr = generateExpression(filter);
      if (filterExpr instanceof Document filterDocument)
      {
        match = new Document("$expr", filterDocument);
      }
    }

    if (orderByList != null)
    {
      int index = 1;
      for (OrderByExpression orderBy : orderByList)
      {
        Object orderExpression = generateExpression(orderBy.getExpression());
        if (orderExpression instanceof Document)
        {
          if (addFields == null) addFields = new Document();
          if (sort == null) sort = new Document();

          addFields.append("_field" + index, orderExpression);
          sort.append("_field" + index, orderBy.isAscending() ? 1 : -1);
          index++;
        }
        else if (orderExpression instanceof String value)
        {
          if (value.startsWith("$"))
          {
            if (sort == null) sort = new Document();
            sort.append(value, orderBy.isAscending() ? 1 : -1);
          }
        }
      }
    }

    List<Document> aggregate = new ArrayList<>();
    if (match != null)
    {
      aggregate.add(new Document("$match", match));
    }
    if (addFields != null)
    {
      aggregate.add(new Document("$addFields", addFields));
    }
    if (sort != null)
    {
      aggregate.add(new Document("$sort", sort));
    }
    return aggregate;
  }

  public Object generateExpression(Expression expression)
  {
    if (expression instanceof Literal literal)
    {
      return literal.getValue();
    }
    else if (expression instanceof Property property)
    {
      String name = property.getName();
      if ("id".equals(name)) name = "_id";
      return new Document("$getField", name);
    }
    else if (expression instanceof FunctionCall functionCall)
    {
      Document document;
      Function function = functionCall.getFunction();
      String functionName = functionMap.get(function);
      if (functionName == null)
        throw new RuntimeException("Unsupported function " + function);

      if (function.getArgumentCount() == 1)
      {
        Expression argumentExpression = functionCall.getArguments().get(0);
        Object argument = generateExpression(argumentExpression);
        document = generateFunction(functionName, argument);
      }
      else
      {
        List<Object> arguments = new ArrayList<>();
        for (Expression argumentExpression : functionCall.getArguments())
        {
          arguments.add(generateExpression(argumentExpression));
        }
        document = generateFunction(functionName, arguments);
      }
      return document;
    }
    return null;
  }

  protected Document generateFunction(String functionName, Object argument)
  {
    Document document = new Document();
    switch (functionName)
    {
      case "#neg" -> document.append("$multiply", List.of(-1, argument));

      default -> document.append(functionName, argument);
    }
    return document;
  }

  protected Document generateFunction(String functionName, List<Object> arguments)
  {
    Document document = new Document();
    switch (functionName)
    {
      case "#contains" -> document.append("$gte",
        List.of(new Document("$indexOfCP", arguments), 0));

      case "#startsWith" -> document.append("$eq",
        List.of(new Document("$indexOfCP", arguments), 0));

      case "#endsWith" -> document.append("$eq",
        List.of(new Document("$indexOfCP", arguments),
          new Document("$subtract",
            List.of(new Document("$strLenCP", arguments.get(0)),
                    new Document("$strLenCP", arguments.get(1))))));

      case "#substring" ->
      {
        if (arguments.size() >= 3)
        {
          document.append("$substrCP",
            List.of(arguments.get(0), arguments.get(1),
              new Document("$substract",
                List.of(arguments.get(2), arguments.get(1)))));
        }
        else
        {
          document.append("$substrCP", arguments);
        }
      }
      default -> document.append(functionName, arguments);
    }
    return document;
  }

  public static void main(String[] args)
  {
    var generator = new MongoExpressionGenerator();
//    Expression expression = fn(EQ, fn(ADD, property("index"), 1), 2);
//    Expression expression = fn(NEG, property("index"));
    Expression expression = fn(ENDSWITH, property("title"), "trencada");

    System.out.println(descending("name").toBsonDocument().toJson());

    Object expr = generator.generateFilter(expression);
    if (expr instanceof Document document)
    {
      System.out.println(document.toJson());
    }

    var orderBy = List.of(
      new OrderByExpression(fn(TOUPPERCASE, property("title"))),
      new OrderByExpression(property("age"), DESC),
      new OrderByExpression(fn(TRIM, property("surname")))
    );
    var result = generator.generateAggregate(fn(CONTAINS, property("title"), "Final"), orderBy);
    for (Document d : result)
    {
      System.out.println(d.toJson());
    }
  }
}
