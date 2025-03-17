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
package org.bimrocket.service.file;

import java.io.Serializable;

/**
 *
 * @author realor
 */
public class Path implements Serializable
{
  public static char PATH_SEPARATOR = '/';

  // path always starts with PATH_SEPARATOR. No trailing PATH_SEPARATOR.
  String path;

  public Path(String path)
  {
    this.path = normalize(path);
  }

  public Path getParent()
  {
    int index = path.lastIndexOf(PATH_SEPARATOR);
    if (index == 0)
    {
      if (path.length() == 1) return null;
      else return new Path(path.substring(0, 1));
    }

    return new Path(path.substring(0, index));
  }

  public Path getChild(String name)
  {
    return new Path(this.path + normalize(name));
  }

  public boolean isRoot()
  {
    return path.equals(PATH_SEPARATOR);
  }

  public String getName()
  {
    int index = path.lastIndexOf(PATH_SEPARATOR);
    return path.substring(index + 1);
  }

  public boolean equals(Path other)
  {
    return path.equals(other.path);
  }

  @Override
  public String toString()
  {
    return path;
  }

  private String normalize(String pathname)
  {
    StringBuilder buffer = new StringBuilder();
    boolean lastSep = true;
    buffer.append(PATH_SEPARATOR);
    int length = pathname.length();
    for (int i = 0; i < length; i++)
    {
      char ch = pathname.charAt(i);
      if (ch == PATH_SEPARATOR)
      {
        if (!lastSep && i < length - 1)
        {
          buffer.append(ch);
        }
        lastSep = true;
      }
      else
      {
        buffer.append(ch);
        lastSep = false;
      }
    }
    return buffer.toString();
  }

  public static void main(String[] args)
  {
    Path path = new Path("/aaa");
    Path parent = path.getParent();
    Path child = path.getChild("/green///897");

    System.out.println(path);
    System.out.println(parent);
    System.out.println(child);

  }
}
