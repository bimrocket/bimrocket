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
import org.bimrocket.express.data.ExpressCursor;
import static org.bimrocket.express.ExpressCollection.LIST;
import org.bimrocket.express.ExpressConstant;
import org.bimrocket.express.data.ExpressData;
import org.bimrocket.step.header.StepFileHeaderData;

/**
 * Loads objects into a ExpressData from a STEP file.
 *
 * @author realor
 */

public class StepLoader
{
  protected ExpressData data;
  protected StepFileHeaderData headerData = new StepFileHeaderData();
  protected ExpressData currentData;

  public StepLoader(ExpressData data)
  {
    this.data = data;
  }

  public ExpressData getData()
  {
    return data;
  }

  public StepFileHeaderData getHeaderData()
  {
    return headerData;
  }

  public void load(String filename) throws IOException
  {
    load(new File(filename));
  }

  public void load(File file) throws IOException
  {
    try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(new FileInputStream(file))))
    {
      load(reader);
    }
  }

  public void load(Reader reader) throws IOException
  {
    StepLexer lexer = new StepLexer(reader);
    String typeName = null;
    ExpressCursor rootCursor = data.getRoot();
    ExpressCursor cursor = null;
    String currentTag = null;
    Map<String, Integer> backwardRefMap = new HashMap<>();
    Map<String, ArrayList<Reference>> forwardRefMap = new HashMap<>();
    Stack<Integer> indexStack = new Stack<>();
    int index = 0;

    try (reader)
    {
      StepToken token = lexer.readToken();
      while (!token.isEOF())
      {
        if (token.isKeyword("HEADER"))
        {
          cursor = headerData.getRoot();
          index = 0;
        }
        else if (token.isKeyword("DATA"))
        {
          cursor = data.getRoot();
          index = 0;
        }
        else if (token.isKeyword("ENDSEC"))
        {
          cursor = null;
        }
        else if (token.isIdentifier())
        {
          typeName = (String)token.getValue();
        }
        else if (token.isOpenParenthesis())
        {
          if (cursor == null)
            throw new IOException("Unexcepted open parethesis");

          indexStack.push(index);

          if (typeName != null)
          {
            cursor.create(index, typeName);
          }
          else
          {
            cursor.create(index, LIST);
          }
          index = 0;
          typeName = null;
        }
        else if (token.isCloseParenthesis())
        {
          if (cursor == null)
            throw new IOException("Unexcepted close parenthesis");

          cursor.exit();
          index = indexStack.pop();
          index++;
        }
        else if (token.isReference())
        {
          String tag = (String)token.getValue();
          if (indexStack.isEmpty()) // start line
          {
            currentTag = tag;
          }
          else if (cursor != null)
          {
            Integer tagIndex = backwardRefMap.get(tag);
            if (tagIndex == null) // forward reference
            {
              ArrayList<Reference> references = forwardRefMap.get(tag);
              if (references == null)
              {
                references = new ArrayList<>();
                forwardRefMap.put(tag, references);
              }
              references.add(new Reference(cursor, index));
              cursor.set(index++, (String)null);
            }
            else // backward reference
            {
              rootCursor.enter(tagIndex);
              cursor.set(index++, rootCursor);
              rootCursor.exit();
            }
          }
          else throw new IOException("Unexcepted tag");
        }
        else if (token.isColon()) // end of line
        {
          if (indexStack.isEmpty() && currentTag != null)
          {
            backwardRefMap.put(currentTag, rootCursor.size() - 1);
            ArrayList<Reference> references = forwardRefMap.remove(currentTag);
            if (references != null)
            {
              rootCursor.enter(rootCursor.size() - 1);
              for (Reference reference : references)
              {
                reference.dereference(rootCursor);
              }
              rootCursor.exit();
            }
          }
        }
        else if (cursor != null)
        {
          if (token.isNumber())
          {
            cursor.set(index++, (Number)token.getValue());
          }
          else if (token.isText())
          {
            cursor.set(index++, (String)token.getValue());
          }
          else if (token.isConstant())
          {
            cursor.set(index++, (ExpressConstant)token.getValue());
          }
          else if (token.isAsterisc() || token.isDollar())
          {
            cursor.set(index++, (String)null);
          }
        }
        token = lexer.readToken();
      }
    }
  }

  static class Reference
  {
    ExpressCursor cursor;
    int index;

    Reference(ExpressCursor cursor, int index)
    {
      this.cursor = cursor.copy();
      this.index = index;
    }

    void dereference(ExpressCursor refCursor)
    {
      cursor.set(index, refCursor);
    }
  }
}
