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
package org.bimrocket.tomcat;

import java.util.logging.ConsoleHandler;
import java.util.logging.Formatter;
import java.util.logging.Level;
import java.util.logging.LogRecord;

/**
 *
 * @author realor
 */
public class ColorConsoleHandler extends ConsoleHandler
{
  private static final String COLOR_RESET = "\u001b[0m";

  private static final String COLOR_SEVERE = "\u001b[91m";
  private static final String COLOR_WARNING = "\u001b[93m";
  private static final String COLOR_INFO = "\u001b[32m";
  private static final String COLOR_CONFIG = "\u001b[94m";
  private static final String COLOR_FINE = "\u001b[36m";
  private static final String COLOR_FINER = "\u001b[35m";
  private static final String COLOR_FINEST = "\u001b[90m";

  private boolean colorsEnabled = false;

  public ColorConsoleHandler()
  {
    String osName = System.getProperty("os.name").toLowerCase();
    colorsEnabled = osName.contains("linux") || osName.contains("windows 11");
  }

  @Override
  public void publish(LogRecord record)
  {
    if (colorsEnabled)
    {
      System.err.print(logRecordToString(record));
      System.err.flush();
    }
    else
    {
      super.publish(record);
    }
  }

  String logRecordToString(LogRecord record)
  {
    Formatter f = getFormatter();
    String msg = f.format(record);

    String prefix;
    Level level = record.getLevel();
    int intLevel = level.intValue();
    if (intLevel >= 1000)
    {
      prefix = COLOR_SEVERE;
    }
    else if (intLevel >= 900)
    {
      prefix = COLOR_WARNING;
    }
    else if (intLevel >= 800)
    {
      prefix = COLOR_INFO;
    }
    else if (intLevel >= 700)
    {
      prefix = COLOR_CONFIG;
    }
    else if (intLevel >= 500)
    {
      prefix = COLOR_FINE;
    }
    else if (intLevel >= 400)
    {
      prefix = COLOR_FINER;
    }
    else
    {
      prefix = COLOR_FINEST;
    }

    return prefix + msg + COLOR_RESET;
  }
}
