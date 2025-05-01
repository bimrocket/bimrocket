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
package org.bimrocket.api.task;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;

/**
 *
 * @author realor
 */
@JsonInclude(Include.NON_NULL)
public class TaskExecution
{
  public static final String RUNNING_STATUS = "running";
  public static final String COMPLETED_STATUS = "completed";
  public static final String FAILED_STATUS = "failed";
  public static final String CANCELLING_STATUS = "cancelling";

  @Id
  private String id;
  @JsonProperty("task_name")
  private String taskName;
  @JsonProperty("start_time")
  private Long startTime;
  @JsonProperty("end_time")
  private Long endTime;
  Object input; // JSON
  Object output; // JSON
  private String status;
  private String error;
  @JsonProperty("invoker")
  private String invokerUserId;
  private String hostname;

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public String getTaskName()
  {
    return taskName;
  }

  public void setTaskName(String taskName)
  {
    this.taskName = taskName;
  }

  public Long getStartTime()
  {
    return startTime;
  }

  public void setStartTime(Long startTime)
  {
    this.startTime = startTime;
  }

  public Long getEndTime()
  {
    return endTime;
  }

  public void setEndTime(Long endTime)
  {
    this.endTime = endTime;
  }

  public Object getInput()
  {
    return input;
  }

  public void setInput(Object input)
  {
    this.input = input;
  }

  public Object getOutput()
  {
    return output;
  }

  public void setOutput(Object output)
  {
    this.output = output;
  }

  public String getStatus()
  {
    return status;
  }

  public void setStatus(String status)
  {
    this.status = status;
  }

  public String getError()
  {
    return error;
  }

  public void setError(String error)
  {
    this.error = error;
  }

  public String getInvokerUserId()
  {
    return invokerUserId;
  }

  public void setInvokerUserId(String invokerUserId)
  {
    this.invokerUserId = invokerUserId;
  }

  public String getHostname()
  {
    return hostname;
  }

  public void setHostname(String hostname)
  {
    this.hostname = hostname;
  }

  @Override
  public String toString()
  {
    return id + " " + taskName + " " + status;
  }
}
