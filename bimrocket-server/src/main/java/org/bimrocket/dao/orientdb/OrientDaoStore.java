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
package org.bimrocket.dao.orientdb;

import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import jakarta.inject.Inject;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.dao.DaoStore;


public class OrientDaoStore implements DaoStore
{
  private String databaseName;
  private String entitiesPackage;

  private boolean initialized;

  @Inject
  OrientPoolManager poolManager;

  public String getDatabaseName()
  {
    return databaseName;
  }

  public void setDatabaseName(String databaseName)
  {
    this.databaseName = databaseName;
  }

  public String getEntitiesPackage()
  {
    return entitiesPackage;
  }

  public void setEntitiesPackage(String entitiesPackage)
  {
    this.entitiesPackage = entitiesPackage;
  }

  public OrientDaoStore()
  {
  }

  public OrientDaoStore(OrientPoolManager poolManager)
  {
    this.poolManager = poolManager;
  }

  @Override
  public DaoConnection getConnection()
  {
    ODatabaseObject db = poolManager.getObjectConnection(databaseName);

    if (!initialized)
    {
      registerEntityClasses(db);
      initialized = true;
    }

    return new OrientDaoConnection(db);
  }

  @Override
  public void close()
  {
    // pool is closed by OrientPoolManager
  }

  protected void registerEntityClasses(ODatabaseObject db)
  {
    if (entitiesPackage != null)
    {
      db.getEntityManager().registerEntityClasses(entitiesPackage);
    }
  }
}
