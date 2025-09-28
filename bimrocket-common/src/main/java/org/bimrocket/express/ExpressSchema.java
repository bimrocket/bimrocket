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
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 *
 * @author realor
 */
public class ExpressSchema
{
  private String name;
  private final Map<String, ExpressNamedType> namedTypes = new HashMap<>();

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public ExpressNamedType getNamedType(String typeName)
  {
    return namedTypes.get(typeName.toUpperCase());
  }

  public void addNamedType(ExpressNamedType namedType)
  {
    namedTypes.put(namedType.getTypeName().toUpperCase(), namedType);
  }

  public Collection<ExpressNamedType> getNamedTypes()
  {
    return namedTypes.values();
  }

  @SuppressWarnings({"unchecked"})
  public <T extends ExpressNamedType> List<T> getNamedTypes(Class<T> type)
  {
    ArrayList<T> types = new ArrayList<>();
    for (ExpressNamedType namedType : namedTypes.values())
    {
      if (type.isAssignableFrom(namedType.getClass()))
      {
        types.add((T)namedType);
      }
    }
    return types;
  }

  public boolean isNamedType(String typeName)
  {
    return namedTypes.containsKey(typeName.toUpperCase());
  }

  public boolean isEntity(String typeName)
  {
    ExpressNamedType namedType = namedTypes.get(typeName.toUpperCase());
    return namedType instanceof ExpressEntity;
  }

  public boolean isDefinedType(String typeName)
  {
    ExpressNamedType namedType = namedTypes.get(typeName.toUpperCase());
    return namedType instanceof ExpressDefinedType;
  }

  public boolean isSelect(String typeName)
  {
    ExpressNamedType namedType = namedTypes.get(typeName.toUpperCase());
    return namedType instanceof ExpressSelect;
  }

  public boolean isEnumeration(String typeName)
  {
    ExpressNamedType namedType = namedTypes.get(typeName.toUpperCase());
    return namedType instanceof ExpressEnumeration;
  }

  public boolean isCollection(String typeName)
  {
    return ExpressCollection.isCollection(typeName);
  }

  public boolean isPrimitive(String typeName)
  {
    return ExpressPrimitive.isPrimitive(typeName);
  }
}
