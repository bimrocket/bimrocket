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
package org.bimrocket.express.data;

import java.util.HashMap;
import java.util.UUID;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.data.GenericData.Element;

/**
 *
 * @author realor
 */
public class GenericData extends AbstractListData<Element>
{
  public GenericData(ExpressSchema schema)
  {
    super(schema);
  }

  public static class Element extends HashMap<String, Object>
  {
    private static final long serialVersionUID = 1L;

    public Element(String type)
    {
      put("_type", type);
      put("_id", UUID.randomUUID().toString());
    }

    @Override
    public final Object put(String name, Object value)
    {
      return super.put(name, value);
    }
  }

  @Override
  protected Element getElement(Object value)
  {
    if (value instanceof Element element)
    {
      return element;
    }
    return null;
  }

  @Override
  protected Element createEntity(ExpressEntity entity)
  {
    return new Element(entity.getTypeName());
  }

  @Override
  protected Element createDefinedType(ExpressDefinedType definedType)
  {
    return new Element(definedType.getTypeName());
  }

  @Override
  protected String getElementTypeName(Element element)
  {
    return (String)element.get("_type");
  }

  @Override
  protected String getElementId(Element element)
  {
    return (String)element.get("_id");
  }

  @Override
  protected Object getElementValue(Element element, String field,
    ExpressType type)
  {
    return element.get(field);
  }

  @Override
  protected void setElementValue(Element element, String field, Object value,
    ExpressType type)
  {
    element.put(field, value);
  }
}