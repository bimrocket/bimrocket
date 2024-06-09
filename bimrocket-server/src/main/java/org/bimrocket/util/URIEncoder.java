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
package org.bimrocket.util;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

/**
 * URIEncoder more similiar to JS encodeURI(uri)
 *
 * @author realor
 */
public class URIEncoder
{
  public static String encode(Object uri)
  {
    return encode(uri, "UTF-8");
  }

  public static String encode(Object uri, String charset)
  {
    try
    {
      return URLEncoder.encode(uri.toString(), charset)
        .replaceAll("\\+", "%20")
        .replaceAll("\\%2F", "/")
        .replaceAll("\\%21", "!")
        .replaceAll("\\%26", "&")
        .replaceAll("\\%27", "'")
        .replaceAll("\\%28", "(")
        .replaceAll("\\%29", ")")
        .replaceAll("\\%3A", ":")
        .replaceAll("\\%3D", "=")
        .replaceAll("\\%3F", "?")
        .replaceAll("\\%7E", "~");
    }
    catch (UnsupportedEncodingException ex)
    {
      throw new RuntimeException(ex);
    }
  }
}
