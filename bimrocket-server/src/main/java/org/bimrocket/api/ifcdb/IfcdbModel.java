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
package org.bimrocket.api.ifcdb;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;
import java.util.HashSet;
import java.util.Set;

/**
 *
 * @author realor
 */
public class IfcdbModel
{
  @Id
  private String id; // project GlobalId

  private String name; // project Name

  private String description; // project Description

  @JsonProperty("last_version")
  private int lastVersion;

  @JsonProperty("read_roles")
  private Set<String> readRoleIds  = new HashSet<>();

  @JsonProperty("upload_roles")
  private Set<String> uploadRoleIds = new HashSet<>();

  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public String getDescription()
  {
    return description;
  }

  public void setDescription(String description)
  {
    this.description = description;
  }

  public int getLastVersion()
  {
    return lastVersion;
  }

  public void setLastVersion(int lastVersion)
  {
    this.lastVersion = lastVersion;
  }

  public Set<String> getReadRoleIds()
  {
    return readRoleIds;
  }

  public void setReadRoleIds(Set<String> readRoleIds)
  {
    this.readRoleIds = readRoleIds;
  }

  public Set<String> getUploadRoleIds()
  {
    return uploadRoleIds;
  }

  public void setUploadRoleIds(Set<String> uploadRoleIds)
  {
    this.uploadRoleIds = uploadRoleIds;
  }
}
