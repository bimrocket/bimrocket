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
package org.bimrocket.odata;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 *
 * @author realor
 */
public class SimpleODataParser
{
  private final Map<String, String> fieldMap;

  public SimpleODataParser(Map<String, String> fieldMap)
  {
    this.fieldMap = fieldMap;
  }

  /* parses $filter with this format:
     field1 eq value2 and field2 eq value2 ... and fieldN eq valueN
  */
  public Map<String, Object> parseFilter(String filter)
  {
    Map<String, Object> map = new HashMap<>();
    if (filter != null)
    {
      String[] andParts = filter.split(" and ");
      for (String andPart : andParts)
      {
        String[] eqParts = andPart.split(" eq ");
        if (eqParts.length == 2)
        {
          String left = eqParts[0].trim();
          String right = eqParts[1].trim();
          Object literal;
          if (isField(left) && right.length() > 0)
          {
            literal = getLiteral(right);
            map.put(fieldMap.get(left), literal);
          }
          else if (isField(right) && left.length() > 0)
          {
            literal = getLiteral(left);
            map.put(fieldMap.get(right), literal);
          }
        }
      }
    }
    return map;
  }

  public List<String> parseOrderBy(String orderBy)
  {
    List<String> list = new ArrayList<>();
    if (orderBy != null)
    {
      String[] parts = orderBy.split(",");
      for (String part : parts)
      {
        part = part.trim();
        String[] fieldOrder = part.split(" ");
        String value = fieldOrder[0].trim();
        if (isField(value))
        {
          value = fieldMap.get(value);
          if (fieldOrder.length >= 2)
          {
            String dir = fieldOrder[1].trim().toLowerCase();
            if (dir.equals("asc") || dir.equals("desc"))
            {
              value += " " + dir;
            }
          }
          list.add(value);
        }
      }
    }
    return list;
  }

  private boolean isField(String token)
  {
    return fieldMap.containsKey(token);
  }

  private boolean isNumber(String token)
  {
    char first = token.charAt(0);
    return Character.isDigit(first) || first == '-' || first == '.';
  }

  private Object getLiteral(String token)
  {
    if (isNumber(token))
    {
      return parseNumber(token);
    }
    else if (isText(token))
    {
      return token.substring(1, token.length() - 1);
    }
    return null;
  }

  private boolean isText(String token)
  {
    return token.startsWith("'") && token.endsWith("'");
  }

  private Number parseNumber(String value)
  {
    try
    {
      if (value.contains(".") || value.toLowerCase().contains("e"))
      {
        return Double.valueOf(value);
      }
      else
      {
        return Integer.valueOf(value);
      }
    }
    catch (NumberFormatException ex)
    {
      return null;
    }
  }

  public static void main(String[] args)
  {
    Map<String, String> map = new HashMap<>();
    map.put("project_id", "projectId");
    map.put("priority", "priority");
    map.put("topic_status", "topicStatus");

    SimpleODataParser parser = new SimpleODataParser(map);
    System.out.println(parser.parseFilter(
      "project_id eq 23.5 and priority eq -5 and 'Sport' eq label "));

    System.out.println(parser.parseOrderBy(
      "name desc, project_id asc,,, 56 desc, size, priority"));

  }
}
