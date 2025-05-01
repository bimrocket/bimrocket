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
package org.bimrocket.service.task.impl.graalvm;

import java.io.InputStream;
import org.apache.commons.io.IOUtils;
import org.bimrocket.service.task.Task;
import org.bimrocket.api.task.TaskExecution;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import static org.bimrocket.service.task.impl.graalvm.Host.toJava;

/**
 *
 * @author realor
 */
public class JSTask extends Task
{
  Source source;

  public JSTask(String name)
  {
    super(name);
  }

  @Override
  public void init(InputStream is) throws Exception
  {
    String code = IOUtils.toString(is, "UTF-8");
    source = Source.create("js", code);
  }

  @Override
  public void destroy() throws Exception
  {
  }

  @Override
  @SuppressWarnings("unchecked")
  public void execute(TaskExecution execution)
  {
    try (Context context = createContext())
    {
      context.eval(source);

      Value bindings = context.getBindings("js");
      bindings.putMember("host", new Host(bindings));
      Value method = bindings.getMember("execute");
      if (method == null || !method.canExecute())
        throw new RuntimeException("execute function not defined");

      Object input = execution.getInput();

      Value value = method.execute(input);

      Object javaObject = toJava(value);
      execution.setOutput(javaObject);
    }
  }

  protected Context createContext()
  {
    return Context.newBuilder("js")
     .allowAllAccess(true)
     .allowHostClassLookup(className -> true)
     .option("engine.WarnInterpreterOnly", "false")
     .build();
  }
}
