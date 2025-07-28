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
package org.bimrocket.util;

import java.lang.reflect.Field;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author realor
 */
public class Cleaner
{
  static final Logger LOGGER = Logger.getLogger(Cleaner.class.getName());

  public static void shutdownExecutor(Object executorHolder, String fieldName)
  {
    try
    {
      Class<?> cls = executorHolder.getClass();
      LOGGER.log(Level.INFO, "Shutting down executor {0}",
        cls.getSimpleName() + "." + fieldName);
      Field field = cls.getDeclaredField(fieldName);
      field.setAccessible(true);
      ExecutorService executorService = (ExecutorService)field.get(executorHolder);
      executorService.shutdownNow();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, ex.toString());
    }
  }

  public static void shutdownStaticExecutor(Class<?> cls, String fieldName)
  {
    try
    {
      LOGGER.log(Level.INFO, "Shutting down executor {0}",
        cls.getSimpleName() + "." + fieldName);
      Field field = cls.getDeclaredField(fieldName);
      field.setAccessible(true);
      ExecutorService executorService = (ExecutorService)field.get(null);
      executorService.shutdownNow();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, ex.toString());
    }
  }
}
