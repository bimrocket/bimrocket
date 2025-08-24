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

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author realor
 */
public class StepFileDescription extends StepFileHeader
{
  private final List<String> description = new ArrayList<>();
  private String implementationLevel = "2;1";

  public List<String> getDescription()
  {
    return description;
  }

  public String getImplementationLevel()
  {
    return implementationLevel;
  }

  public void setImplementationLevel(String implementationLevel)
  {
    this.implementationLevel = implementationLevel;
  }

  @Override
  public String toString()
  {
    StringBuilder buffer = new StringBuilder();
    buffer.append("FILE_DESCRIPTION(");
    buffer.append(toString(description));
    buffer.append(",");
    buffer.append(quote(implementationLevel));
    buffer.append(");");
    return buffer.toString();
  }
}
