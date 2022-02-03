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
public class BcfDocumentReference
{
  @Id
  @JsonProperty("guid")
  private String id;

  @JsonProperty("document_guid")
  private String documentGuid;

  @JsonProperty("url")
  private String url;

  @JsonProperty("description")
  private String description;

  @JsonProperty("topic_guid")
  private String topicId;

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public String getDocumentGuid()
  {
    return documentGuid;
  }

  public void setDocumentGuid(String documentGuid)
  {
    this.documentGuid = documentGuid;
  }

  public String getUrl()
  {
    return url;
  }

  public void setUrl(String url)
  {
    this.url = url;
  }

  public String getDescription()
  {
    return description;
  }

  public void setDescription(String description)
  {
    this.description = description;
  }

  public String getTopicId()
  {
    return topicId;
  }

  public void setTopicId(String topicId)
  {
    this.topicId = topicId;
  }
}
