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

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 *
 * @author realor
 */
public class ExpressSelect extends ExpressNamedType
{
  private final List<ExpressNamedType> options = new ArrayList<>();

  public ExpressSelect(String name)
  {
    super(name);
  }
  
  public List<ExpressNamedType> getOptions()
  {
    return options;
  }

  @Override
  public String toString()
  {
    StringBuilder buffer = new StringBuilder();
    Iterator<ExpressNamedType> iter = options.iterator();
    if (iter.hasNext())
    {
      buffer.append(iter.next().getName());
      while (iter.hasNext())
      {
        buffer.append(", ");
        buffer.append(iter.next().getName());
      }    
    }
    return "TYPE " + getName() + " = SELECT [" + buffer.toString() + "]";
  }
}
