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
package org.bimrocket.service.security.store;

import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import com.orientechnologies.orient.core.entity.OEntityManager;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.object.metadata.schema.OSchemaProxyObject;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.bimrocket.api.security.Role;
import org.bimrocket.api.security.User;
import org.bimrocket.dao.orientdb.OrientDaoStore;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class SecurityOrientDaoStore extends OrientDaoStore
  implements SecurityDaoStore
{
  static final String BASE = "services.security.store.orient.";

  @PostConstruct
  public void init()
  {
    Config config = ConfigProvider.getConfig();
    setDatabaseName(config.getValue(BASE + "database", String.class));
  }

  @Override
  protected void registerEntityClasses(ODatabaseObject db)
  {
    // generate schema
    OSchemaProxyObject schema = db.getMetadata().getSchema();

    schema.generateSchema(User.class);
    schema.generateSchema(Role.class);

    OClass userClass = schema.getClass(User.class);
    if (userClass.getIndexes().isEmpty())
    {
      userClass.createIndex("UserIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    }

    OClass roleClass = schema.getClass(Role.class);
    if (roleClass.getIndexes().isEmpty())
    {
      roleClass.createIndex("RoleIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    }
    // register persistent classes
    OEntityManager entityManager = db.getEntityManager();
    entityManager.registerEntityClass(User.class);
    entityManager.registerEntityClass(Role.class);
  }
}
