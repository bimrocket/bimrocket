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
package org.bimrocket.api.bcf;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author realor
 */
public class BcfTopic
{
  @Id
  @JsonProperty("guid")
  private String id;

  @JsonProperty("topic_type")
  private String topicType;

  @JsonProperty("topic_status")
  private String topicStatus;

  @JsonProperty("reference_links")
  private List<String> referenceLinks = new ArrayList<>();

  @JsonProperty("title")
  private String title;

  @JsonProperty("priority")
  private String priority;

  @JsonProperty("index")
  private Integer index;

  @JsonProperty("labels")
  private List<String> labels = new ArrayList<>();

  @JsonProperty("creation_date")
  private String creationDate;

  @JsonProperty("creation_author")
  private String creationAuthor;

  @JsonProperty("modify_date")
  private String modifyDate;

  @JsonProperty("modify_author")
  private String modifyAuthor;

  @JsonProperty("assigned_to")
  private String assignedTo;

  @JsonProperty("stage")
  private String stage;

  @JsonProperty("description")
  private String description;

  @JsonProperty("due_date")
  private String dueDate;

  @JsonIgnore
  private String projectId;
  
  @JsonIgnore
  private int lastViewpointIndex;
  
  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public String getTopicType()
  {
    return topicType;
  }

  public void setTopicType(String topicType)
  {
    this.topicType = topicType;
  }

  public String getTopicStatus()
  {
    return topicStatus;
  }  
  
  public void setTopicStatus(String topicStatus)
  {
    this.topicStatus = topicStatus;
  }

  public List<String> getReferenceLinks()
  {
    return referenceLinks;
  }

  public void setReferenceLinks(List<String> referenceLinks)
  {
    this.referenceLinks = referenceLinks;
  }

  public String getTitle()
  {
    return title;
  }

  public void setTitle(String title)
  {
    this.title = title;
  }

  public String getPriority()
  {
    return priority;
  }

  public void setPriority(String priority)
  {
    this.priority = priority;
  }

  public Integer getIndex()
  {
    return index;
  }

  public void setIndex(Integer index)
  {
    this.index = index;
  }

  public List<String> getLabels()
  {
    return labels;
  }

  public void setLabels(List<String> labels)
  {
    this.labels = labels;
  }

  public String getCreationDate()
  {
    return creationDate;
  }

  public void setCreationDate(String creationDate)
  {
    this.creationDate = creationDate;
  }

  public String getCreationAuthor()
  {
    return creationAuthor;
  }

  public void setCreationAuthor(String creationAuthor)
  {
    this.creationAuthor = creationAuthor;
  }

  public String getModifyDate()
  {
    return modifyDate;
  }

  public void setModifyDate(String modifyDate)
  {
    this.modifyDate = modifyDate;
  }

  public String getModifyAuthor()
  {
    return modifyAuthor;
  }

  public void setModifyAuthor(String modifyAuthor)
  {
    this.modifyAuthor = modifyAuthor;
  }

  public String getAssignedTo()
  {
    return assignedTo;
  }

  public void setAssignedTo(String assignedTo)
  {
    this.assignedTo = assignedTo;
  }

  public String getStage()
  {
    return stage;
  }

  public void setStage(String stage)
  {
    this.stage = stage;
  }

  public String getDescription()
  {
    return description;
  }

  public void setDescription(String description)
  {
    this.description = description;
  }

  public String getDueDate()
  {
    return dueDate;
  }

  public void setDueDate(String dueDate)
  {
    this.dueDate = dueDate;
  }

  public String getProjectId()
  {
    return projectId;
  }

  public void setProjectId(String projectId)
  {
    this.projectId = projectId;
  }

  public int getLastViewpointIndex()
  {
    return lastViewpointIndex;
  }

  public void setLastViewpointIndex(int lastViewpointIndex)
  {
    this.lastViewpointIndex = lastViewpointIndex;
  }
  
  public void incrementLastViewpointIndex()
  {
    this.lastViewpointIndex++;
  }
}
