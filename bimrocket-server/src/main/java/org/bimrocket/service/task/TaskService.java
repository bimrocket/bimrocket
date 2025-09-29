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
package org.bimrocket.service.task;

import org.bimrocket.api.task.TaskInvocation;
import org.bimrocket.api.task.TaskExecution;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.collections4.map.LRUMap;
import org.bimrocket.api.task.TaskData;
import org.bimrocket.dao.Dao;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.service.file.FileService;
import org.bimrocket.service.file.Metadata;
import org.bimrocket.service.file.Path;
import org.bimrocket.service.task.store.empty.TaskEmptyDaoStore;
import org.bimrocket.service.security.SecurityService;
import org.bimrocket.service.task.impl.graalvm.JSTask;
import org.eclipse.microprofile.config.Config;
import org.bimrocket.service.task.store.TaskDaoStore;
import org.bimrocket.service.task.store.TaskDaoConnection;
import static org.bimrocket.service.file.Privilege.READ;
import static org.bimrocket.api.task.TaskExecution.RUNNING_STATUS;
import static org.bimrocket.api.task.TaskExecution.COMPLETED_STATUS;
import static org.bimrocket.api.task.TaskExecution.FAILED_STATUS;
import static org.bimrocket.api.task.TaskExecution.CANCELLING_STATUS;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.util.EntityDefinition;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class TaskService
{
  static final Logger LOGGER =
    Logger.getLogger(TaskService.class.getName());

  static final String BASE = "services.task.";

  public static final Map<String, Field> executionFieldMap =
     EntityDefinition.getInstance(TaskExecution.class).getFieldMap();

  ExecutorService executorService;

  Map<String, Task> tasks;

  Map<String, TaskExecutor> executors;

  @Inject
  Config config;

  @Inject
  SecurityService securityService;

  @Inject
  FileService fileService;

  TaskDaoStore daoStore;

  String hostname;

  @PostConstruct
  public void init()
  {
    executorService = Executors.newCachedThreadPool();

    int taskCacheSize =
      config.getOptionalValue(BASE + "taskCacheSize", Integer.class).orElse(10);

    tasks = Collections.synchronizedMap(new LRUMap<>(taskCacheSize));

    executors = new ConcurrentHashMap<>();

    hostname = getHostname();

    CDI<Object> cdi = CDI.current();
    try
    {
      @SuppressWarnings("unchecked")
      Class<TaskDaoStore> storeClass =
        config.getValue(BASE + "store.class", Class.class);
      daoStore = cdi.select(storeClass).get();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, "Invalid TaskDaoStore: {0}",
        config.getOptionalValue(BASE + "store.class", String.class).orElse(null));
      daoStore = cdi.select(TaskEmptyDaoStore.class).get();
    }
    LOGGER.log(Level.INFO, "TaskDaoStore: {0}", daoStore.getClass());
  }

  @PreDestroy
  public void destroy()
  {
    executorService.shutdownNow();
  }

  public List<TaskExecution> getTaskExecutions(
    Expression filter, List<OrderByExpression> orderBy)
  {
    try (TaskDaoConnection conn = daoStore.getConnection())
    {
      Dao<TaskExecution, String> executionDao = conn.getTaskExecutionDao();
      return executionDao.find(filter, orderBy);
    }
  }

  public TaskExecution getTaskExecution(String executionId, long waitTime)
  {
    TaskExecutor executor = executors.get(executionId);
    if (executor != null)
    {
      return executor.waitForCompletion(waitTime);
    }
    else
    {
      try (TaskDaoConnection conn = daoStore.getConnection())
      {
        Dao<TaskExecution, String> taskExecutionDao = conn.getTaskExecutionDao();
        return taskExecutionDao.findById(executionId);
      }
    }
  }

  public TaskExecution executeTask(TaskInvocation invocation)
  {
    try
    {
      String taskName = invocation.getTaskName();
      Task task = getTask(taskName);

      TaskExecutor executor = new TaskExecutor(task, invocation);

      executor.execute();

      return executor.waitForCompletion(invocation.getWaitTime());
    }
    catch (RuntimeException ex)
    {
      throw ex;
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  public boolean cancelTaskExecution(String executionId)
  {
    TaskExecutor executor = executors.get(executionId);
    if (executor != null)
    {
      return executor.cancel();
    }
    else
    {
      try (TaskDaoConnection conn = daoStore.getConnection())
      {
        Dao<TaskExecution, String> taskExecutionDao = conn.getTaskExecutionDao();
        TaskExecution execution = taskExecutionDao.findById(executionId);
        if (RUNNING_STATUS.equals(execution.getStatus()))
        {
          execution.setStatus(CANCELLING_STATUS);
          taskExecutionDao.update(execution);
        }
      }
    }
    return false;
  }

  public TaskData loadTaskData(String dataId)
  {
    try (TaskDaoConnection conn = daoStore.getConnection())
    {
      return conn.getTaskDataDao().findById(dataId);
    }
  }

  public TaskData saveTaskData(TaskData data)
  {
    try (TaskDaoConnection conn = daoStore.getConnection())
    {
      Dao<TaskData, String> taskDataDao = conn.getTaskDataDao();

      if (data.getId() == null)
      {
        data.setId(UUID.randomUUID().toString());
        return taskDataDao.insert(data);
      }
      else
      {
        return taskDataDao.save(data);
      }
    }
  }

  public boolean deleteTaskData(String dataId)
  {
    try (TaskDaoConnection conn = daoStore.getConnection())
    {
      return conn.getTaskDataDao().deleteById(dataId);
    }
  }

  public TaskDaoStore getDaoStore()
  {
    return daoStore;
  }

  // internal methods

  String getHostname()
  {
    String host = config.getOptionalValue("hostname", String.class).orElse(null);
    if (host == null)
    {
      try
      {
        host = InetAddress.getLocalHost().getHostName();
      }
      catch (UnknownHostException ex)
      {
        host = null;
      }
    }
    return host;
  }

  void insertInStore(TaskExecution execution)
  {
    try (TaskDaoConnection conn = daoStore.getConnection())
    {
      conn.getTaskExecutionDao().insert(execution);
    }
  }

  void updateInStore(TaskExecution execution)
  {
    try (TaskDaoConnection conn = daoStore.getConnection())
    {
      conn.getTaskExecutionDao().update(execution);
    }
  }

  Task getTask(String taskName) throws Exception
  {
    Path taskPath = getBasePath().getChild(taskName);

    Metadata metadata;
    try
    {
      metadata = fileService.get(taskPath, READ); // TODO: change to EXECUTE
    }
    catch (NotFoundException ex)
    {
      throw new InvalidRequestException("Task not found");
    }

    Task task = tasks.get(taskName);
    if (task == null || metadata.getCreationDate() > task.getCreationDate())
    {
      if (task != null) task.destroy();

      task = createTask(taskName);
      try (InputStream is = fileService.read(taskPath, null))
      {
        task.init(is);
        tasks.put(taskName, task);
      }
    }
    return task;
  }

  Task createTask(String taskName)
  {
    int index = taskName.lastIndexOf(".");
    String type = index == -1 ? "js" : taskName.substring(index + 1);

    Task task = switch (type)
    {
      case "java" -> new JSTask(taskName);
      default -> new JSTask(taskName);
    };
    return task;
  }

  Path getBasePath()
  {
    return new Path("/tasks");
  }

  class TaskExecutor implements Runnable
  {
    Task task;
    TaskExecution execution;
    Future<?> future;

    TaskExecutor(Task task, TaskInvocation invocation)
    {
      this.task = task;
      execution = new TaskExecution();
      execution.setId(UUID.randomUUID().toString());
      execution.setTaskName(task.getName());
      execution.setStartTime(System.currentTimeMillis());
      execution.setInput(invocation.getInput());
      execution.setInvokerUserId(securityService.getCurrentUserId());
      execution.setHostname(hostname);
    }

    void execute()
    {
      execution.setStatus(RUNNING_STATUS);
      insertInStore(execution);

      future = executorService.submit(this);
      executors.put(execution.getId(), this);
    }

    @Override
    public void run()
    {
      try
      {
        securityService.setCurrentUserId(execution.getInvokerUserId());
        task.execute(execution);
        execution.setStatus(COMPLETED_STATUS);
      }
      catch (Exception ex)
      {
        execution.setError(ex.toString());
        execution.setStatus(FAILED_STATUS);
      }
      finally
      {
        securityService.setCurrentUserId(null);
        executors.remove(execution.getId());
        execution.setEndTime(System.currentTimeMillis());
        updateInStore(execution);
      }
    }

    TaskExecution waitForCompletion(long waitTime)
    {
      if (waitTime > 0)
      {
        try
        {
          future.get(waitTime, TimeUnit.MILLISECONDS);
        }
        catch (Exception ex)
        {
        }
      }
      return execution;
    }

    boolean isDone()
    {
      return future.isDone();
    }

    boolean isCancelled()
    {
      return future.isCancelled();
    }

    boolean cancel()
    {
      if (RUNNING_STATUS.equals(execution.getStatus()))
      {
        execution.setStatus(CANCELLING_STATUS);
        updateInStore(execution);
      }
      return future.cancel(true);
    }
  }
}
