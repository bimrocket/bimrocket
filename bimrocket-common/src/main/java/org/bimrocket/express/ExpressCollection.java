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

package org.bimrocket.express;

/**
 *
 * @author realor
 */
public class ExpressCollection extends ExpressType
{
  public static final String LIST = "LIST";
  public static final String SET = "SET";
  public static final String ARRAY = "ARRAY";
  public static final String BAG = "BAG";

  private ExpressType itemType;
  private int minOccurrences;
  private int maxOccurrences;

  public ExpressCollection(String typeName)
  {
    super(typeName);
  }

  public static boolean isCollection(String typeName)
  {
    return LIST.equals(typeName) ||
           SET.equals(typeName) ||
           ARRAY.equals(typeName) ||
           BAG.equals(typeName);
  }

  public ExpressType getItemType()
  {
    return itemType;
  }

  public void setItemType(ExpressType itemType)
  {
    this.itemType = itemType;
  }

  public int getMinOccurrences()
  {
    return minOccurrences;
  }

  public void setMinOccurrences(int minOccurrences)
  {
    this.minOccurrences = minOccurrences;
  }

  public int getMaxOccurrences()
  {
    return maxOccurrences;
  }

  public void setMaxOccurrences(int maxOccurrences)
  {
    this.maxOccurrences = maxOccurrences;
  }

  @Override
  public String toString()
  {
    String elementTypeName = itemType instanceof ExpressNamedType namedType ?
      namedType.getTypeName() :
      (itemType == null ? "?" : itemType.toString());

    String maxOccurText = maxOccurrences == 0 ?
      "?" : String.valueOf(maxOccurrences);

    return getTypeName() +
      "[" + minOccurrences + ":" + maxOccurText + "] OF " + elementTypeName;
  }
}
