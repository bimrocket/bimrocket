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
package org.bimrocket.api.bcf;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 *
 * @author realor
 */
public class BcfExtensions
{
  @Id
  @JsonIgnore
  private String projectId;

  @JsonProperty("topic_type")
  private List<String> topicType = new ArrayList<>();

  @JsonProperty("topic_status")
  private List<String> topicStatus = new ArrayList<>();

  @JsonProperty("topic_label")
  private List<String> topicLabel = new ArrayList<>();

  @JsonProperty("snippet_type")
  private List<String> snippetType = new ArrayList<>();

  @JsonProperty("priority")
  private List<String> priority = new ArrayList<>();

  @JsonProperty("user_id_type")
  private List<String> userIdType = new ArrayList<>();

  @JsonProperty("stage")
  private List<String> stage = new ArrayList<>();

  @JsonProperty("read_roles")
  private Set<String> readRoleIds = new HashSet<>();

  @JsonProperty("comment_roles")
  private Set<String> commentRoleIds = new HashSet<>();

  @JsonProperty("create_roles")
  private Set<String> createRoleIds = new HashSet<>();

  @JsonProperty("update_roles")
  private Set<String> updateRoleIds = new HashSet<>();

  @JsonProperty("delete_roles")
  private Set<String> deleteRoleIds = new HashSet<>();

  public List<String> getTopicType()
  {
    return topicType;
  }

  public void setTopicType(List<String> topicType)
  {
    this.topicType = topicType;
  }

  public List<String> getTopicStatus()
  {
    return topicStatus;
  }

  public void setTopicStatus(List<String> topicStatus)
  {
    this.topicStatus = topicStatus;
  }

  public List<String> getTopicLabel()
  {
    return topicLabel;
  }

  public void setTopicLabel(List<String> topicLabel)
  {
    this.topicLabel = topicLabel;
  }

  public List<String> getPriority()
  {
    return priority;
  }

  public List<String> getSnippetType()
  {
    return snippetType;
  }

  public void setSnippetType(List<String> snippetType)
  {
    this.snippetType = snippetType;
  }

  public void setPriority(List<String> priority)
  {
    this.priority = priority;
  }

  public List<String> getUserIdType()
  {
    return userIdType;
  }

  public void setUserIdType(List<String> userIdType)
  {
    this.userIdType = userIdType;
  }

  public List<String> getStage()
  {
    return stage;
  }

  public void setStage(List<String> stage)
  {
    this.stage = stage;
  }

  public String getProjectId()
  {
    return projectId;
  }

  public void setProjectId(String projectId)
  {
    this.projectId = projectId;
  }

  public Set<String> getReadRoleIds()
  {
    return readRoleIds;
  }

  public void setReadRoleIds(Set<String> readRoleIds)
  {
    this.readRoleIds = readRoleIds;
  }

  public Set<String> getCommentRoleIds()
  {
    return commentRoleIds;
  }

  public void setCommentRoleIds(Set<String> commentRoleIds)
  {
    this.commentRoleIds = commentRoleIds;
  }

  public Set<String> getCreateRoleIds()
  {
    return createRoleIds;
  }

  public void setCreateRoleIds(Set<String> createRoleIds)
  {
    this.createRoleIds = createRoleIds;
  }

  public Set<String> getUpdateRoleIds()
  {
    return updateRoleIds;
  }

  public void setUpdateRoleIds(Set<String> updateRoleIds)
  {
    this.updateRoleIds = updateRoleIds;
  }

  public Set<String> getDeleteRoleIds()
  {
    return deleteRoleIds;
  }

  public void setDeleteRoleIds(Set<String> deleteRoleIds)
  {
    this.deleteRoleIds = deleteRoleIds;
  }

  public void setDefaultValues()
  {
    topicType.add("Architecture");
    topicType.add("Structural");
    topicType.add("Mechanical");
    topicType.add("Electrical");
    topicType.add("Plumbing");

    topicStatus.add("Open");
    topicStatus.add("Reopen");
    topicStatus.add("Closed");

    priority.add("Low");
    priority.add("Medium");
    priority.add("High");
  }
}
