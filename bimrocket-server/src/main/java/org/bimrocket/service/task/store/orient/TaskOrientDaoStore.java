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
package org.bimrocket.service.task.store.orient;

import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.metadata.schema.OSchema;
import jakarta.annotation.PostConstruct;
import org.bimrocket.api.task.TaskData;
import org.bimrocket.dao.orient.OrientDaoStore;
import org.bimrocket.api.task.TaskExecution;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;
import org.bimrocket.service.task.store.TaskDaoStore;
import org.bimrocket.service.task.store.TaskDaoConnection;

/**
 *
 * @author realor
 */
/**
 *
 * @author realor
 */
public class TaskOrientDaoStore extends OrientDaoStore<TaskDaoConnection>
  implements TaskDaoStore
{
  static final String BASE = "services.task.store.orient.";

  @PostConstruct
  public void init()
  {
    Config config = ConfigProvider.getConfig();
    setDbAlias(config.getValue(BASE + "database", String.class));
  }

  @Override
  protected void registerEntityClasses(OSchema schema)
  {
    // generate schema

    OClass taskExecutionClass = registerEntityClass(schema, TaskExecution.class);
    OClass taskDataClass = registerEntityClass(schema, TaskData.class);

    createIndex(taskExecutionClass, "TaskExecutionIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    createIndex(taskDataClass, "TaskDataIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
  }

  @Override
  public TaskDaoConnection getConnection()
  {
    return new TaskOrientDaoConnection(getOrientConnection());
  }
}