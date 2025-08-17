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

package org.bimrocket.service.ifcdb.store.orient;

import com.orientechnologies.orient.core.record.OElement;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.step.io.StepExporter;

/**
 *
 * @author realor
 */
public class OrientStepExporter extends StepExporter
{
  public OrientStepExporter(ExpressSchema schema)
  {
    super(schema);
  }

  @Override
  protected String getTypeName(Object object)
  {
    if (object instanceof OElement)
    {
      return ((OElement)object).getSchemaType().get().getName();
    }
    return null;
  }

  @Override
  protected Object getPropertyValue(Object object, String propertyName)
  {
    if (object instanceof OElement)
    {
      return ((OElement)object).getProperty(propertyName);
    }
    return null;
  }

  @Override
  protected Object getValue(Object object)
  {
    if (object instanceof OElement)
    {
      return ((OElement)object).getProperty("value");
    }
    return null;
  }
}
