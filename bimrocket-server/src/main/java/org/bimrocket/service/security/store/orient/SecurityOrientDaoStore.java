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
package org.bimrocket.service.security.store.orient;

import jakarta.annotation.PostConstruct;
import org.bimrocket.api.security.Role;
import org.bimrocket.api.security.User;
import org.bimrocket.dao.orient.OrientDaoStore;
import org.bimrocket.service.security.store.SecurityDaoConnection;
import org.bimrocket.service.security.store.SecurityDaoStore;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;
import com.orientechnologies.orient.core.metadata.schema.OClass;
import org.bimrocket.dao.orient.OrientSetup;

/**
 *
 * @author realor
 */
public class SecurityOrientDaoStore extends OrientDaoStore<SecurityDaoConnection>
  implements SecurityDaoStore
{
  static final String BASE = "services.security.store.orient.";

  @PostConstruct
  public void init()
  {
    Config config = ConfigProvider.getConfig();
    setDbAlias(config.getValue(BASE + "database", String.class));
  }

  @Override
  protected void createClasses(OrientSetup orientSetup)
  {
    // generate schema
    OClass userClass = orientSetup.createClass(User.class);
    OClass roleClass = orientSetup.createClass(Role.class);

    orientSetup.createIndex(userClass,
      "UserIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    orientSetup.createIndex(userClass,
      "UserNameIdx", OClass.INDEX_TYPE.NOTUNIQUE, "name");
    orientSetup.createIndex(roleClass,
      "RoleIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    orientSetup.createIndex(roleClass,
      "RoleDescriptionIdx", OClass.INDEX_TYPE.NOTUNIQUE, "description");
  }

  @Override
  public SecurityDaoConnection getConnection()
  {
    return new SecurityOrientDaoConnection(getOrientConnection());
  }
}
