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
package org.bimrocket.api;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 *
 * @author realor
 */
public class ApiResult
{
  public static final ApiResult OK = new ApiResult(200, "OK");

  @JsonProperty("code")
  private int code;

  @JsonProperty("message")
  private String message;

  public ApiResult()
  {
  }

  public ApiResult(int code, String message)
  {
    this.code = code;
    this.message = message;
  }

  public int getCode()
  {
    return code;
  }

  public void setCode(int code)
  {
    this.code = code;
  }

  public String getMessage()
  {
    return message;
  }

  public void setMessage(String message)
  {
    this.message = message;
  }

  @Override
  public String toString()
  {
    StringBuilder buffer = new StringBuilder();
    buffer.append(code);
    if (message != null)
    {
      buffer.append(": ");
      buffer.append(message);
    }
    return buffer.toString();
  }
}
