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

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;

/**
 *
 * @author realor
 */
public class BcfComment
{
  @Id
  @JsonProperty("guid")
  private String id;
  
  @JsonProperty("date")
  private String date;

  @JsonProperty("author")
  private String author;

  @JsonProperty("comment")
  private String comment;

  @JsonProperty("topic_guid")
  private String topicId;

  @JsonProperty("viewpoint_guid")
  private String viewpointId;

  @JsonProperty("replay_to_comment_guid")
  private String replayToCommentId;

  @JsonProperty("modify_date")
  private String modifyDate;

  @JsonProperty("modify_author")
  private String modifyAuthor;

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public String getDate()
  {
    return date;
  }

  public void setDate(String date)
  {
    this.date = date;
  }

  public String getAuthor()
  {
    return author;
  }

  public void setAuthor(String author)
  {
    this.author = author;
  }

  public String getComment()
  {
    return comment;
  }

  public void setComment(String comment)
  {
    this.comment = comment;
  }

  public String getTopicId()
  {
    return topicId;
  }

  public void setTopicId(String topicId)
  {
    this.topicId = topicId;
  }

  public String getViewpointId()
  {
    return viewpointId;
  }

  public void setViewpointId(String viewpointId)
  {
    this.viewpointId = viewpointId;
  }

  public String getReplayToCommentId()
  {
    return replayToCommentId;
  }

  public void setReplayToCommentId(String replayToCommentId)
  {
    this.replayToCommentId = replayToCommentId;
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
}
