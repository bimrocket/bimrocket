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

/**
 *
 * @author realor
 */
import java.io.File;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author realor
 */
public class ShutdownFileMonitor extends Thread
{
  private final File runningFile;
  private final Runnable shutdownAction;
  private static final Logger LOGGER = Logger.getLogger("ShutdownFileMonitor");

  public static void setup(File runningFile, Runnable shutdownAction)
  {
    ShutdownFileMonitor monitor = new ShutdownFileMonitor(runningFile, shutdownAction);
    monitor.start();
  }

  ShutdownFileMonitor(File runningFile, Runnable shutdownAction)
  {
    this.runningFile = runningFile;
    this.shutdownAction = shutdownAction;
  }

  @Override
  public void run()
  {
    try
    {
      runningFile.createNewFile();
    }
    catch (IOException ex)
    {
      LOGGER.log(Level.WARNING, "Shutdown file {0} could not be created: {1}",
        new Object[]{runningFile.getName(), ex.toString()});
      return;
    }

    try
    {
      while (runningFile.exists())
      {
        Thread.sleep(1000);
      }
      shutdownAction.run();
    }
    catch (InterruptedException ex)
    {
      // ignore
    }
  }
}