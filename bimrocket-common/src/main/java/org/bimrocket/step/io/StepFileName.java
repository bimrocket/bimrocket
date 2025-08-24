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
package org.bimrocket.step.io;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author realor
 */
public class StepFileName extends StepFileHeader
{
  private String name;
  private long timestamp = System.currentTimeMillis();
  private final List<String> author = new ArrayList<>();
  private final List<String> organization = new ArrayList<>();
  private String preprocessorVersion = "BIMROCKET Express preprocessor 1.0";
  private String authorization = "BIMROCKET STEP Exporter";
  private String other;

  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  public long getTimestamp()
  {
    return timestamp;
  }

  public void setTimestamp(long timestamp)
  {
    this.timestamp = timestamp;
  }

  public List<String> getAuthor()
  {
    return author;
  }

  public List<String> getOrganization()
  {
    return organization;
  }

  public String getPreprocessorVersion()
  {
    return preprocessorVersion;
  }

  public void setPreprocessorVersion(String preprocessorVersion)
  {
    this.preprocessorVersion = preprocessorVersion;
  }

  public String getAuthorization()
  {
    return authorization;
  }

  public void setAuthorization(String authorization)
  {
    this.authorization = authorization;
  }

  public String getOther()
  {
    return other;
  }

  public void setOther(String other)
  {
    this.other = other;
  }

  @Override
  public String toString()
  {
    String isoDate = Instant.ofEpochMilli((timestamp / 1000) * 1000)
      .atZone(ZoneId.systemDefault())
      .toLocalDateTime()
      .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

    StringBuilder buffer = new StringBuilder();
    buffer.append("FILE_NAME(");
    buffer.append(quote(name));
    buffer.append(",");
    buffer.append(quote(isoDate));
    buffer.append(",");
    buffer.append(toString(author));
    buffer.append(",");
    buffer.append(toString(organization));
    buffer.append(",");
    buffer.append(quote(preprocessorVersion));
    buffer.append(",");
    buffer.append(quote(authorization));
    buffer.append(",");
    buffer.append(quote(other));
    buffer.append(");");
    return buffer.toString();
  }
}
