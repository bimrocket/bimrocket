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
package org.bimrocket.dao;

import com.orientechnologies.orient.core.Orient;
import com.orientechnologies.orient.core.db.OrientDBConfig;
import com.orientechnologies.orient.object.db.ODatabaseObjectPool;


public class OrientDAOConnectionFactory implements DAOConnectionFactory
{
  private ODatabaseObjectPool dbPool;
  private String url;
  private String username;
  private String password;

  public String getUrl()
  {
    return url;
  }

  public void setUrl(String url)
  {
    this.url = url;
  }

  public String getUsername()
  {
    return username;
  }

  public void setUsername(String username)
  {
    this.username = username;
  }

  public String getPassword()
  {
    return password;
  }

  public void setPassword(String password)
  {
    this.password = password;
  }
  
  public OrientDAOConnectionFactory()
  {
    Orient.instance().removeShutdownHook();        
  }
  
  @Override
  public DAOConnection getConnection()
  {
    if (dbPool == null)
    {
      synchronized(this)
      {
        dbPool = new ODatabaseObjectPool(url,
          username, password, OrientDBConfig.defaultConfig());
      }
    }    
    return new OrientDAOConnection(dbPool.acquire());
  }  
  
  @Override
  public void close()
  {
    if (dbPool != null)
    {
      dbPool.close();
    }
    Orient.instance().shutdown();
  }
}
