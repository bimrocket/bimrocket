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
package org.bimrocket.service.bcf.store.orient;

import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import com.orientechnologies.orient.core.entity.OEntityManager;
import com.orientechnologies.orient.object.metadata.schema.OSchemaProxyObject;
import jakarta.annotation.PostConstruct;
import org.bimrocket.api.bcf.*;
import org.bimrocket.dao.orient.OrientDaoStore;
import org.bimrocket.service.bcf.store.BcfDaoConnection;
import org.bimrocket.service.bcf.store.BcfDaoStore;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

/**
 *
 * @author realor
 */
public class BcfOrientDaoStore extends OrientDaoStore<BcfDaoConnection>
  implements BcfDaoStore
{
  static final String BASE = "services.bcf.store.orient.";

  @PostConstruct
  public void init()
  {
    Config config = ConfigProvider.getConfig();
    setDbAlias(config.getValue(BASE + "database", String.class));
  }

  @Override
  protected void registerEntityClasses(ODatabaseObject db)
  {
    // generate schema
    OSchemaProxyObject schema = db.getMetadata().getSchema();

    schema.generateSchema(BcfColoring.class);
    schema.generateSchema(BcfComment.class);
    schema.generateSchema(BcfComponent.class);
    schema.generateSchema(BcfComponents.class);
    schema.generateSchema(BcfDirection.class);
    schema.generateSchema(BcfExtensions.class);
    schema.generateSchema(BcfLine.class);
    schema.generateSchema(BcfOrthogonalCamera.class);
    schema.generateSchema(BcfPerspectiveCamera.class);
    schema.generateSchema(BcfDocumentReference.class);
    schema.generateSchema(BcfPoint.class);
    schema.generateSchema(BcfProject.class);
    schema.generateSchema(BcfTopic.class);
    schema.generateSchema(BcfVector.class);
    schema.generateSchema(BcfViewpoint.class);
    schema.generateSchema(BcfSnapshot.class);

    // register persistent classes
    OEntityManager entityManager = db.getEntityManager();
    entityManager.registerEntityClass(BcfColoring.class);
    entityManager.registerEntityClass(BcfComment.class);
    entityManager.registerEntityClass(BcfComponent.class);
    entityManager.registerEntityClass(BcfComponents.class);
    entityManager.registerEntityClass(BcfDirection.class);
    entityManager.registerEntityClass(BcfExtensions.class);
    entityManager.registerEntityClass(BcfLine.class);
    entityManager.registerEntityClass(BcfOrthogonalCamera.class);
    entityManager.registerEntityClass(BcfPerspectiveCamera.class);
    entityManager.registerEntityClass(BcfDocumentReference.class);
    entityManager.registerEntityClass(BcfPoint.class);
    entityManager.registerEntityClass(BcfProject.class);
    entityManager.registerEntityClass(BcfTopic.class);
    entityManager.registerEntityClass(BcfVector.class);
    entityManager.registerEntityClass(BcfViewpoint.class);
    entityManager.registerEntityClass(BcfSnapshot.class);
  }

  @Override
  public BcfDaoConnection getConnection()
  {
    return new BcfOrientDaoConnection(getOrientConnection());
  }
}
