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
package org.bimrocket.dao.orient;

import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import jakarta.inject.Inject;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.dao.DaoStore;


public abstract class OrientDaoStore<C extends DaoConnection>
  implements DaoStore<C>
{
  private String dbAlias;
  private String entitiesPackage;

  private boolean initialized;

  @Inject
  OrientPoolManager poolManager;

  public String getDbAlias()
  {
    return dbAlias;
  }

  public void setDbAlias(String dbAlias)
  {
    this.dbAlias = dbAlias;
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

  protected ODatabaseObject getOrientConnection()
  {
    ODatabaseObject db = poolManager.getObjectConnection(dbAlias);

    if (!initialized)
    {
      registerEntityClasses(db);
      initialized = true;
    }

    return db;
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
