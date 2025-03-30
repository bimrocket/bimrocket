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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Enumeration;
import java.util.Properties;
import org.apache.catalina.LifecycleException;
import org.apache.catalina.connector.Connector;
import org.apache.catalina.startup.Tomcat;

/**
 *
 * @author realor
 */
public class BimRocketTomcat extends Tomcat
{
  File runningFile = new File("running");

  public void startup() throws UnknownHostException, LifecycleException
  {
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
      if (runningFile.exists())
      {
        shutdown();
        runningFile.delete();
      }
    }));

    ShutdownFileMonitor.setup(runningFile, () -> shutdown());

    File baseDir = new File(".").getAbsoluteFile();

    System.out.println("BIMROCKET");
    System.out.println("OS name: " + System.getProperty("os.name"));
    System.out.println("OS arch: " + System.getProperty("os.arch"));
    System.out.println("OS version: " + System.getProperty("os.version"));
    System.out.println("Tomcat home: " + baseDir.getAbsolutePath());

    setBaseDir(".");

    configServer();

    File webappFile = new File(baseDir, "/webapps/bimrocket-webapp.war");
    addWebapp("", webappFile.getAbsolutePath());

    File serverFile = new File(baseDir, "/webapps/bimrocket-server.war");
    addWebapp("/bimrocket-server", serverFile.getAbsolutePath());

    start();

    String hostAddress = getLocalHostAddress();
    Connector connector = getConnector();

    System.out.println("Server started.");
    System.out.println("Listening on http://" + hostAddress + ":" + connector.getPort());

    getServer().await();
  }

  public void shutdown()
  {
    try
    {
      System.out.println("\nShutdown...");
      getServer().stop();
      TomcatLogManager.resetFinally();
    }
    catch (LifecycleException ex)
    {
      // ignore
    }
  }

  String getLocalHostAddress()
  {
    try
    {
      return InetAddress.getLocalHost().getHostAddress();
    }
    catch (Exception ex)
    {
      return "localhost";
    }
  }

  void configServer()
  {
    try
    {
      Properties properties = new Properties();
      File config = new File("./conf/catalina.properties");

      if (config.exists())
      {
        try (FileInputStream fis = new FileInputStream(config))
        {
          properties.load(fis);

          Enumeration<?> propertyNames = properties.propertyNames();
          while (propertyNames.hasMoreElements())
          {
            String propetyName = String.valueOf(propertyNames.nextElement());
            String propertyValue = String.valueOf(properties.get(propetyName));
            System.setProperty(propetyName, propertyValue);
          }
        }
      }

      String portString = System.getProperty("tomcat.port", "8080");

      Connector connector = getConnector();
      connector.setPort(Integer.parseInt(portString));
    }
    catch (IOException | NumberFormatException ex)
    {
      System.err.println("Error reading configuration: " + ex.toString());
      System.exit(1);
    }
  }

  public static void main(String[] args) throws Exception
  {
    BimRocketTomcat tomcat = new BimRocketTomcat();
    tomcat.startup();
  }
}
