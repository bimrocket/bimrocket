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

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Stack;
import org.bimrocket.express.ExpressNamedType;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.express.ExpressType;

/**
 *
 * @author realor
 * @param <M> the model type
 */
public abstract class StepLoader<M>
{
  private StepLexer lexer;
  private ExpressSchema schema;
  protected M model;

  public StepLoader()
  {
  }

  public StepLoader(ExpressSchema schema)
  {
    this.schema = schema;
  }

  public M load(String filename) throws IOException
  {
    return load(new File(filename));
  }
  
  public M load(File file) throws IOException
  {
    try
    (BufferedReader reader = 
      new BufferedReader(new InputStreamReader(new FileInputStream(file))))
    {
      return load(reader);
    }
  }  
  
  public M load(Reader reader) throws IOException
  {
    model = createModel();
    lexer = new StepLexer(reader);
    String typeName = null;
    StepBuilder<? extends Object> builder = null;
    String currentTag = null;
    Map<String, Object> tags = new HashMap<>();
    ArrayList<Reference> references = new ArrayList<>();
    String section = null;

    Stack<StepBuilder<? extends Object>> stack = new Stack<>();
    try
    {
      StepToken token = lexer.readToken();
      while (!token.isEOF())
      {
        if (token.isKeyword("HEADER"))
        {
          section = "HEADER";
        }
        else if (token.isKeyword("DATA"))
        {
          section = "DATA";
        }
        else if (token.isKeyword("ENDSEC"))
        {
          section = null;
        }
        else if (token.isIdentifier())
        {
          typeName = (String)token.getValue();
        }
        else if (token.isOpenParenthesis())
        {
          if (builder != null)
          {
            stack.push(builder);
          }
          builder = createBuilder(section, typeName, builder);
          typeName = null;
        }
        else if (token.isCloseParenthesis())
        {
          if (!stack.isEmpty() && builder != null)
          {
            Object instance = builder.getInstance();
            builder = stack.pop();
            builder.add(instance);
          }
        }
        else if (token.isReference())
        {
          String tag = (String)token.getValue();
          if (builder == null)
          {
            currentTag = tag;
          }
          else
          {
            int index = builder.add(null);
            references.add(new Reference(builder, tag, index));
          }
        }
        else if (token.isColon())
        {
          if (builder != null)
          {
            Object instance = builder.getInstance();
            if ("DATA".equals(section) && currentTag != null)
            {
              tags.put(currentTag, instance);
              String tagTypeName = builder.getTypeName();
              processTaggedInstance(currentTag, tagTypeName, instance);
            }
            else if ("HEADER".equals(section))
            {
              processHeader(builder.getTypeName(), instance);
            }
            builder = null;
          }
        }
        else if (builder != null)
        {
          if (token.isNumber() || token.isText() || token.isDollar() ||
            token.isAsterisc() || token.isConstant())
          {
            builder.add(token.getValue());
          }
        }
        token = lexer.readToken();
      }
    }
    finally
    {
      reader.close();
    }

    for (Reference reference: references)
    {
      reference.dereference(tags);
    }

    return model;
  }

  protected abstract M createModel();

  protected StepBuilder<? extends Object> createBuilder(String section, 
    String typeName, StepBuilder<? extends Object> builder)
  {
    if ("DATA".equals(section))
    {
      ExpressType type;
      if (schema != null && typeName != null)
      {
        type = schema.getNamedType(typeName);
      }
      else if (builder != null)
      {
        type = builder.getExpectedType();
      }
      else type = null;

      return type == null ? createBuilder(typeName) : createBuilder(type);
    }
    else if ("HEADER".equals(section))
    {
      return new GenericStepBuilder(typeName);
    }
    return null;
  }

  protected StepBuilder<? extends Object> createBuilder(String typeName)
  {
    return new GenericStepBuilder(typeName);
  }
  
  protected StepBuilder<? extends Object> createBuilder(ExpressType type)
  {
    String typeName = type instanceof ExpressNamedType ? 
      ((ExpressNamedType)type).getName() : null;
    return new GenericStepBuilder(typeName);    
  }

  protected void processTaggedInstance(String tag, 
    String typeName, Object instance)
  {
  }

  protected void processHeader(String typeName, Object header)
  {
  }
  
  protected class Reference
  {
    StepBuilder<? extends Object> builder;
    String tag;
    int index;

    Reference(StepBuilder<? extends Object> builder, String tag, int index)
    {
      this.builder = builder;
      this.tag = tag;
      this.index = index;
    }

    void dereference(Map<String, Object> tags)
    {
      builder.set(index, tags.get(tag));
    }
  }
}
