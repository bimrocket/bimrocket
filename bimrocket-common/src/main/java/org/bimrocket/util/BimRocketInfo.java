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

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

/**
 *
 * @author realor
 */
public class BimRocketInfo
{
  static Properties properties;

  public static String getVersionLabel()
  {
    String tagName = getClosestTagName();
    String buildVersion = getBuildVersion();
    String commitCount = getCommitCount();

    StringBuilder buffer = new StringBuilder();
    if (tagName.startsWith("v")) buffer.append(tagName.substring(1));
    else buffer.append(buildVersion);
    buffer.append("-r");
    buffer.append(commitCount);

    return buffer.toString();
  }

  public static Properties getProperties()
  {
    loadPropertiesIfNeeded();

    return properties;
  }

  public static String getClosestTagName()
  {
    return getProperty("git.closest.tag.name");
  }

  public static String getBuildVersion()
  {
    return getProperty("git.build.version");
  }

  public static String getCommitCount()
  {
    return getProperty("git.total.commit.count");
  }

  public static String getProperty(String name)
  {
    loadPropertiesIfNeeded();

    return properties.getProperty(name);
  }

  private static void loadPropertiesIfNeeded()
  {
    if (properties == null)
    {
      properties = new Properties();
      try
      {
        ClassLoader classLoader = BimRocketInfo.class.getClassLoader();
        try (InputStream is = classLoader.getResourceAsStream(
          "org/bimrocket/util/git.properties"))
        {
          properties.load(is);
        }
      }
      catch (Exception ex)
      {
        // ignore: no git data available
      }
    }
  }

  public static void main(String[] args) throws Exception
  {
    if (args.length < 2)
    {
      System.out.println("Usage: <input_file> <output_file>");
    }
    else
    {
      String versionLabel = BimRocketInfo.getVersionLabel();
      String inputFilename = args[0];
      Path inputPath = Paths.get(inputFilename);
      String content = new String(Files.readAllBytes(inputPath), "UTF-8");
      content = content.replace("$VERSION$", versionLabel);
      String outputFilename = args[1];
      Path outputPath = Paths.get(outputFilename);
      Files.write(outputPath, content.getBytes("UTF-8"));
      System.out.println("Version label [" + versionLabel + "] updated.");
    }
  }
}
