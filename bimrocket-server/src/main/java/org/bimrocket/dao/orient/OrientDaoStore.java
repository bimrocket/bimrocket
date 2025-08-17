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

import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import com.orientechnologies.orient.core.metadata.OMetadata;
import com.orientechnologies.orient.core.metadata.schema.OSchema;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.dao.DaoStore;
import jakarta.inject.Inject;
import java.util.logging.Logger;

/**
 *
 * @author realor
 * @param <C> the Dao connection
 */
public abstract class OrientDaoStore<C extends DaoConnection>
  implements DaoStore<C>
{
  static final protected Logger LOGGER =
    Logger.getLogger(OrientDaoStore.class.getName());

  public static final String MAP_CLASS = "Map";

  private String dbAlias;
  private boolean initialized;

  @Inject
  OrientPoolManager poolManager;

  public OrientDaoStore()
  {
  }

  public OrientDaoStore(OrientPoolManager poolManager)
  {
    this.poolManager = poolManager;
  }

  public String getDbAlias()
  {
    return dbAlias;
  }

  public void setDbAlias(String dbAlias)
  {
    this.dbAlias = dbAlias;
  }

  protected ODatabaseDocument getOrientConnection()
  {
    ODatabaseDocument db = poolManager.getDocumentConnection(dbAlias);

    synchronized (this)
    {
      if (!initialized)
      {
        OMetadata ometadata = db.getMetadata();
        OSchema oschema = ometadata.getSchema();
        if (!oschema.existsClass(MAP_CLASS))
        {
          oschema.createClass(MAP_CLASS);
        }
        createClasses(new OrientSetup(db));
        initialized = true;
      }
    }
    return db;
  }

  @Override
  public void close()
  {
    // store is closed by OrientPoolManager
  }

  protected void createClasses(OrientSetup setup)
  {
  }
}
