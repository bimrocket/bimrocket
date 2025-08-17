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

/**
 *
 * @author realor
 */
public class IfcdbVersion
{
  private int version;

  @JsonProperty("creation_date")
  private String creationDate;

  @JsonProperty("creation_author")
  private String creationAuthor;

  @JsonProperty("element_count")
  int elementCount;

  public int getVersion()
  {
    return version;
  }

  public void setVersion(int version)
  {
    this.version = version;
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

  public int getElementCount()
  {
    return elementCount;
  }

  public void setElementCount(int elementCount)
  {
    this.elementCount = elementCount;
  }
}
