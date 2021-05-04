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

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;
import org.bimrocket.express.io.ExpressLoader;
import org.bimrocket.step.io.DefaultStepLoader.Model;

/**
 *
 * @author realor
 */
public class DefaultStepLoader extends StepLoader<Model>
{
  public DefaultStepLoader()
  {
  }

  public DefaultStepLoader(ExpressSchema schema)
  {
    super(schema);
  }  
  
  @Override
  protected Model createModel()
  {
    return new Model();
  }
  
  @Override
  public StepBuilder createBuilder(ExpressType type)
  {
    if (type instanceof ExpressCollection)
    {
      return new ListBuilder((ExpressCollection)type, new ArrayList<>());
    }
    else if (type instanceof ExpressEntity)
    {
      return new MapBuilder((ExpressEntity)type, new HashMap<>());
    }
    else if (type instanceof ExpressDefinedType)
    {
      return new SimpleMapBuilder((ExpressDefinedType)type, new HashMap<>());
    }
    else return null;
  }

  @Override
  protected void processTaggedInstance(String tag, String typeName, 
    Object instance)
  {
    model.addElement(typeName, instance);
  }
  
  public class Model
  {
    protected final List<Object> elements = new ArrayList<>();
    protected final Map<String, List<Object>> elementsByType = new HashMap<>();
    
    public List<Object> getElements()
    {
      return elements;
    }
    
    public List<Object> getElements(String typeName)
    {
      return elementsByType.get(typeName.toUpperCase());
    }
    
    protected void addElement(String typeName, Object instance)
    {
      typeName = typeName.toUpperCase();
      List<Object> typeElements = elementsByType.get(typeName);
      if (typeElements == null)
      {
        typeElements = new ArrayList<>();
        elementsByType.put(typeName, typeElements);
      }
      typeElements.add(instance);
    }
  }

  public static void main(String args[]) throws IOException
  {
    String filename = "/home/realor/Documentos/work/IFC/models/ROS/ROS_ARC.ifc";

    ExpressLoader expressParser = new ExpressLoader();
    ExpressSchema schema = expressParser.load("schema:IFC4x1");
    DefaultStepLoader loader = new DefaultStepLoader(schema);

    Model model = loader.load(filename);
    List<Object> objects = model.getElements("IfcWall");
    if (objects != null)
    {
      for (Object object : objects)
      {
        System.out.println(object);
      }
    }
  }
}
