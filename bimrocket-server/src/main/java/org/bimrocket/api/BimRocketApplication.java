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
package org.bimrocket.api;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.inject.Inject;
import jakarta.servlet.ServletContext;
import java.beans.BeanInfo;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.beanutils.BeanUtils;
import org.glassfish.jersey.server.ResourceConfig;

/**
 *
 * @author realor
 */
public class BimRocketApplication extends ResourceConfig
{
  private static final Logger LOGGER = Logger.getLogger("BimRocketApplication");
  private final CloseableList closeableList = new CloseableList();

  @Inject
  ServletContext context;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "BimRocket INIT");
    packages("org.bimrocket.api");
    register(CORSFilter.class);
    register(AuthenticationFilter.class);
    initBeans();
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "BimRocket DESTROY");
    for (AutoCloseable closeable : closeableList)
    {
      try
      {
        closeable.close();
      }
      catch (Exception ex)
      {
        // ignore
      }
    }
  }

  protected void initBeans()
  {
    String value = context.getInitParameter("bimrocket.beans");
    if (value != null)
    {
      String[] beanNames = value.split(",");
      for (String beanName : beanNames)
      {
        beanName = beanName.trim();
        Object bean = createBean(beanName);
        if (bean instanceof AutoCloseable)
        {
          closeableList.add((AutoCloseable)bean);
        }
        property(beanName, bean);
        context.setAttribute(beanName, bean);
      }
    }
  }

  protected Object createBean(String beanName)
  {
    try
    {
      LOGGER.log(Level.INFO, "Creating bean [{0}]", beanName);
      String beanClassName = context.getInitParameter(beanName + ".class");
      Class<?> beanClass = Class.forName(beanClassName);
      BeanInfo beanInfo = Introspector.getBeanInfo(beanClass);
      Object bean = beanClass.getDeclaredConstructor().newInstance();
      PropertyDescriptor[] properties = beanInfo.getPropertyDescriptors();
      for (PropertyDescriptor property : properties)
      {
        if (property.getWriteMethod() != null)
        {
          String propertyName = property.getName();
          String attributeName = beanName + "." + propertyName;
          String value = context.getInitParameter(attributeName);
          if (value != null)
          {
            BeanUtils.setProperty(bean, property.getName(), value);
          }
        }
      }
      return bean;
    }
    catch (Exception ex)
    {
      throw new RuntimeException("Can't create bean [" + beanName + "]:", ex);
    }
  }

  public class CloseableList extends ArrayList<AutoCloseable>
  {
    private static final long serialVersionUID = 19693L;
  }
}
