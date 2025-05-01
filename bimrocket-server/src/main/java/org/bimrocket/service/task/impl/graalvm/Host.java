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

import jakarta.enterprise.inject.spi.CDI;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import org.bimrocket.api.task.TaskData;
import org.bimrocket.service.file.FileService;
import org.bimrocket.service.ifcdb.IfcDatabaseService;
import org.bimrocket.service.mail.MailService;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.service.task.TaskService;
import org.graalvm.polyglot.Value;

/**
 *
 * @author realor
 */
public class Host
{
  Value bindings;

  public Host(Value bindings)
  {
    this.bindings = bindings;
  }

  public Object load(String dataId)
  {
    TaskData data = getTaskService().loadTaskData(dataId);
    return data == null ? null : data.getData();
  }

  public void save(String dataId, Object guestData)
  {
    Value value = bindings.getContext().asValue(guestData);
    Object hostData = toJava(value);

    TaskData data = new TaskData();
    data.setId(dataId);
    data.setData(hostData);

    getTaskService().saveTaskData(data);
  }

  public TaskService getTaskService()
  {
    return CDI.current().select(TaskService.class).get();
  }

  public SecurityService getSecurityService()
  {
    return CDI.current().select(SecurityService.class).get();
  }

  public FileService getFileService()
  {
    return CDI.current().select(FileService.class).get();
  }

  public MailService getMailService()
  {
    return CDI.current().select(MailService.class).get();
  }

  public IfcDatabaseService getIfcDatabaseService()
  {
    return CDI.current().select(IfcDatabaseService.class).get();
  }

  public static Object toJava(Value value)
  {
    if (value.isHostObject())
    {
      return value.asHostObject();
    }
    else if (value.fitsInInt())
    {
      return value.asInt();
    }
    else if (value.fitsInLong())
    {
      return value.asLong();
    }
    else if (value.isNumber())
    {
      return value.asDouble();
    }
    else if (value.isBoolean())
    {
      return value.asBoolean();
    }
    else if (value.isString())
    {
      return value.asString();
    }
    else if (value.isDate())
    {
      ZoneId zoneId = ZoneId.systemDefault();
      return value.asDate().atStartOfDay(zoneId).toInstant().toEpochMilli();
    }
    else if (value.hasArrayElements())
    {
      List<Object> list = new ArrayList<>();
      long size = value.getArraySize();
      for (long i = 0; i < size; i++)
      {
        Value item = value.getArrayElement(i);
        list.add(toJava(item));
      }
      return list;
    }
    else if (value.hasMembers())
    {
      HashMap<String, Object> map = new HashMap<>();
      Set<String> keys = value.getMemberKeys();
      for (String key : keys)
      {
        Value item = value.getMember(key);
        map.put(key, toJava(item));
      }
      return map;
    }
    else
    {
      return null;
    }
  }
}
