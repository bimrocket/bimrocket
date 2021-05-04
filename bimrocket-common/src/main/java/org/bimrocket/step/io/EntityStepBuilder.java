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

package org.bimrocket.step.io;

import java.util.List;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressType;

/**
 *
 * @author realor
 * @param <E> the type built by this builder
 */
public abstract class EntityStepBuilder<E> 
  extends TypedStepBuilder<E, ExpressEntity>
{
  protected int index;
  
  @Override
  public int add(Object value)
  {
    int i = index;
    set(i, value);
    index++;
    return i;
  }
  
  @Override
  public void set(int index, Object item)
  {
    List<ExpressAttribute> attributes = type.getAllAttributes();
    if (index < attributes.size())
    {
      ExpressAttribute attribute = attributes.get(index);
      set(attribute.getName(), item);
    }    
  }
  
  public abstract void set(String attributeName, Object value);

  @Override
  public String getTypeName()
  {
    return type.getName();
  }
  
  @Override
  public ExpressType getExpectedType()
  {
    List<ExpressAttribute> attributes = type.getAllAttributes();
    return index < attributes.size() ? attributes.get(index).getType() : null;
  }  
}
