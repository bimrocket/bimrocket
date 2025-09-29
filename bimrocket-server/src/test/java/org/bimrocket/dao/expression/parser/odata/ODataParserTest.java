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
package org.bimrocket.dao.expression.parser.odata;

import org.bimrocket.dao.expression.io.odata.ODataParser;
import java.util.List;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.dao.expression.io.log.LogExpressionPrinter;
import org.bimrocket.dao.orient.OrientExpressionPrinter;
import org.bimrocket.exception.ParseException;
import org.bimrocket.service.bcf.BcfService;
import org.junit.jupiter.api.Assertions;
import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.aggregator.ArgumentsAccessor;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.FieldSource;

/**
 *
 * @author realor
 */
public class ODataParserTest
{
  private ODataParser parser;

  public ODataParserTest()
  {
    parser = new ODataParser(BcfService.topicFieldMap);
  }

  public static final List<Arguments> validFilterList = List.of(

    Arguments.of(
      "title eq 'Torre de l''ombra'",
      "(eq title 'Torre de l\\\'ombra')",
      "title = 'Torre de l\\\'ombra'"
    ),

    Arguments.of(
     "index lt 2",
     "(lt index 2)",
     "index < 2"
    ),

    Arguments.of(
     "trim(title) eq 'Project'",
     "(eq (trim title) 'Project')",
     "title.trim() = 'Project'"
    ),

    Arguments.of(
     "endswith(tolower(trim(title)), 'ing')",
     "(endsWith (toLowerCase (trim title)) 'ing')",
     "title.trim().toLowerCase() like '%' + 'ing'"
    ),

    Arguments.of(
     "index add 1 add 2 add 3 eq 8",
     "(eq (add index 1 2 3) 8)",
     "index + 1 + 2 + 3 = 8"
    ),

    Arguments.of(
     "round(1257 div index) sub ceiling(index div 3) gt 5",
     "(gt (sub (round (div 1257 index)) (ceil (div index 3))) 5)",
     "math_round(1257 / index) - math_ceil(index / 3) > 5"
    ),

    Arguments.of(
     "concat(toupper(title), cast(floor(index div 7), 'Edm.String')) eq 'A8'",
     "(eq (concat (toUpperCase title) (toString (floor (div index 7)))) 'A8')",
     "title.toUpperCase() + math_floor(index / 7).asString() = 'A8'"
    ),

    Arguments.of(
     "tolower(concat(title, '*')) eq 'abc*'",
     "(eq (toLowerCase (concat title '*')) 'abc*')",
     "min(title + '*', null).toLowerCase() = 'abc*'"
    ),

    Arguments.of(
     "((index add 2) add 6) add 7 eq 15",
     "(eq (add (add (add index 2) 6) 7) 15)",
     "index + 2 + 6 + 7 = 15"
    ),

    Arguments.of(
      "concat(title, '-', cast(index, 'Edm.String')) eq 'Formentor-3'",
      "(eq (concat title '-' (toString index)) 'Formentor-3')",
      "title + '-' + index.asString() = 'Formentor-3'"
    ),

    Arguments.of(
      "title eq 'Can Maginàs' and priority eq 'HIGH'",
      "(and (eq title 'Can Maginàs') (eq priority 'HIGH'))",
      "title = 'Can Maginàs' and priority = 'HIGH'"
    ),

    Arguments.of(
      "title ne 'Can Maginàs' and not priority eq 'LOW'",
      "(and (ne title 'Can Maginàs') (not (eq priority 'LOW')))",
      "title <> 'Can Maginàs' and not (priority = 'LOW')"
    ),

    Arguments.of(
      "contains(title, 'Can') or endswith(title, 'vila')",
      "(or (contains title 'Can') (endsWith title 'vila'))",
      "title like '%' + 'Can' + '%' or title like '%' + 'vila'"
    ),

    Arguments.of(
     "index div length(title) lt -2.56e-12",
     "(lt (div index (length title)) -2.56E-12)",
     "index / title.length() < -2.56E-12"
    ),

    Arguments.of(
      "index mod 2 eq 0 or index sub - -2 ne - 8 or index eq -4",
      "(or (eq (mod index 2) 0) (ne (sub index (neg -2)) (neg 8)) (eq index -4))",
      "index % 2 = 0 or index - - -2 <> - 8 or index = -4"
    ),

    Arguments.of(
      "modify_date lt '2025-03-01' and (priority gt '3' or substring(title, 2, 6) eq '023')",
      "(and (lt modifyDate '2025-03-01') (or (gt priority '3') (eq (substring title 2 (add 2 6)) '023')))",
      "modifyDate < '2025-03-01' and (priority > '3' or title.substring(2, 2 + 6) = '023')"
    )
  );

  public static final List<Arguments> invalidFilterList = List.of(

    Arguments.of(
      "priority eq 'HIGH",
      ParseException.class
    ),

    Arguments.of(
      "(priority ne 'LOW'",
      ParseException.class
    ),

    Arguments.of(
      "title eq 'House')",
      ParseException.class
    ),

    Arguments.of(
      "index eq 12g",
      ParseException.class
    ),

    Arguments.of(
      "concat(title, 'House')",
      Exception.class
    )
  );

  public static final List<Arguments> validOrderByList = List.of(

    Arguments.of(
      "priority",
      "((asc priority))",
      "priority"
    ),

    Arguments.of(
      "priority, due_date",
      "((asc priority) (asc dueDate))",
      "priority, dueDate"
    ),

    Arguments.of(
      "priority desc, due_date, toupper(topic_status) asc",
      "((desc priority) (asc dueDate) (asc (toUpperCase topicStatus)))",
      "priority desc, dueDate, topicStatus.toUpperCase()"
    ),

    Arguments.of(
      " priority asc ,   title,topic_status ",
      "((asc priority) (asc title) (asc topicStatus))",
      "priority, title, topicStatus"
    )
  );

  public static final List<Arguments> invalidOrderByList = List.of(

    Arguments.of(
      "priority,, index",
      ParseException.class
    ),

    Arguments.of(
      "title, priority,",
      ParseException.class
    ),

    Arguments.of(
      "(title, priority)",
      ParseException.class
    ),

    Arguments.of(
      "title, priority)",
      ParseException.class
    ),

    Arguments.of(
      "title, priority des",
      ParseException.class
    ),

    Arguments.of(
      "title add 4, priority",
      Exception.class
    )
  );


  @ParameterizedTest(name="{index} {0}")
  @FieldSource("validFilterList")
  public void parseValidFilter(ArgumentsAccessor accessor)
  {
    String odata = accessor.get(0, String.class);
    String logExpected = accessor.get(1, String.class);
    String orientExpected = accessor.get(2, String.class);
    int index = accessor.getInvocationIndex();

    System.out.println("parseValidFilter[" + index + "]:");
    System.out.println(odata);
    Expression filterExpr = parser.parseFilter(odata);
    String logResult = LogExpressionPrinter.toString(filterExpr);
    String orientResult = OrientExpressionPrinter.toString(filterExpr);

    System.out.println(logResult);
    System.out.println(orientResult);

    assertEquals(logResult, logExpected);
    assertEquals(orientResult, orientExpected);
  }

  @ParameterizedTest(name="{index} {0}")
  @FieldSource("invalidFilterList")
  public void parseInvalidFilter(ArgumentsAccessor accessor)
  {
    String odata = accessor.get(0, String.class);
    @SuppressWarnings("unchecked")
    Class<? extends Exception> exceptionClass = accessor.get(1, Class.class);
    int index = accessor.getInvocationIndex();

    System.out.println("parseInvalidFilter[" + index + "]:");
    System.out.println(odata);

    Exception exception =
      Assertions.assertThrows(exceptionClass, () -> parser.parseFilter(odata));

    System.out.println(exception.toString());
  }

  @ParameterizedTest(name="{index} {0}")
  @FieldSource("validOrderByList")
  public void parseValidOrderBy(ArgumentsAccessor accessor)
  {
    String odata = accessor.get(0, String.class);
    String logExpected = accessor.get(1, String.class);
    String orientExpected = accessor.get(2, String.class);
    int index = accessor.getInvocationIndex();

    System.out.println("parseValidOrderBy[" + index + "]:");
    System.out.println(odata);
    List<OrderByExpression> orderByExpr = parser.parseOrderBy(odata);
    String logResult = LogExpressionPrinter.toString(orderByExpr);
    String orientResult = OrientExpressionPrinter.toString(orderByExpr);

    System.out.println(logResult);
    System.out.println(orientResult);

    assertEquals(logResult, logExpected);
    assertEquals(orientResult, orientExpected);
  }

  @ParameterizedTest(name="{index} {0}")
  @FieldSource("invalidOrderByList")
  public void parseInvalidOrderBy(ArgumentsAccessor accessor)
  {
    String odata = accessor.get(0, String.class);
    @SuppressWarnings("unchecked")
    Class<? extends Exception> exceptionClass = accessor.get(1, Class.class);
    int index = accessor.getInvocationIndex();

    System.out.println("parseInvalidOrderBy[" + index + "]:");
    System.out.println(odata);

    Exception exception =
      Assertions.assertThrows(exceptionClass, () -> parser.parseOrderBy(odata));

    System.out.println(exception.toString());
  }
}
