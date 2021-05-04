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
import java.util.List;

/**
 *
 * @author realor
 */
public class ExpressEntity extends ExpressNamedType
{
  private boolean _abstract;
  private ExpressEntity superEntity;
  private final List<ExpressAttribute> attributes = new ArrayList<>();
  private List<ExpressAttribute> allAttributes;
    
  public ExpressEntity(String name)
  {
    super(name);
  }
  
  public boolean isAbstract()
  {
    return _abstract;
  }

  public boolean setAbstract(boolean _abstract)
  {
    return _abstract;
  }

  public ExpressEntity getSuperEntity()
  {
    return superEntity;
  }

  public void setSuperEntity(ExpressEntity superEntity)
  {
    this.superEntity = superEntity;
  }
  
  public ExpressEntity getRootEntity()
  {
    return superEntity == null ? this : superEntity.getRootEntity();
  }
  
  public List<ExpressAttribute> getAttributes()
  {
    return attributes;
  }

  public List<ExpressAttribute> getAllAttributes()
  {
    return getAllAttributes(false);
  }  
  
  public List<ExpressAttribute> getAllAttributes(boolean update)
  {
    if (allAttributes == null || update)
    {
      ArrayList<ExpressAttribute> list = new ArrayList<>();
      collectAttributes(list);
      allAttributes = list;
    }
    return allAttributes;
  }
  
  private void collectAttributes(List<ExpressAttribute> list)
  {
    if (superEntity != null)
    {
      superEntity.collectAttributes(list);
    }
    list.addAll(attributes);
  }
  
  @Override
  public String toString()
  {
    String value = "ENTITY " + getName();
    if (superEntity != null) value += " SUBTYPE OF " + superEntity.getName();
    return value;
  }
}
