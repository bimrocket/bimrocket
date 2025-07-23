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

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.util.List;
import static org.apache.commons.lang.StringUtils.isBlank;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;

/**
 *
 * @author realor
 */
public abstract class ExpressionParser
{
  public abstract Expression parseFilter(Reader filter) throws IOException;

  public abstract List<OrderByExpression> parseOrderBy(Reader orderBy)
    throws IOException;

  public Expression parseFilter(String filter)
  {
    try
    {
      if (isBlank(filter)) return null;
      return parseFilter(new StringReader(filter));
    }
    catch (IOException ex)
    {
      // never happen
      return null;
    }
  }

  public List<OrderByExpression> parseOrderBy(String orderBy)
  {
    try
    {
      if (isBlank(orderBy)) return null;
      return parseOrderBy(new StringReader(orderBy));
    }
    catch (IOException ex)
    {
      // never happen
      return null;
    }
  }
}
