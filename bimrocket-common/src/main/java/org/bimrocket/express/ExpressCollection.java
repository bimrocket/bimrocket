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
  
  private final String collectionType;
  private ExpressType elementType;
  private int minOccurrences;
  private int maxOccurrences;

  public ExpressCollection(String collectionType)
  {
    this.collectionType = collectionType;
  }
  
  public String getCollectionType()
  {
    return collectionType;
  }

  public ExpressType getElementType()
  {
    return elementType;
  }

  public void setElementType(ExpressType elementType)
  {
    this.elementType = elementType;
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
    String elementTypeName = elementType instanceof ExpressNamedType ? 
      ((ExpressNamedType)elementType).getName() : elementType.toString();
    
    return collectionType + 
      "[" + minOccurrences + ":" + maxOccurrences + "] OF " + elementTypeName;
  }

  public static boolean isCollection(String name)
  {
    return LIST.equals(name) ||
      SET.equals(name) ||
      ARRAY.equals(name);
  }
}
