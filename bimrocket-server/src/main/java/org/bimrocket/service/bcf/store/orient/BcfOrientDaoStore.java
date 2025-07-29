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

import com.orientechnologies.orient.core.metadata.schema.OClass;
import com.orientechnologies.orient.core.metadata.schema.OSchema;
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
  protected void registerEntityClasses(OSchema schema)
  {
    // generate schema
    registerEntityClass(schema, BcfColoring.class);
    registerEntityClass(schema, BcfComponent.class);
    registerEntityClass(schema, BcfComponents.class);
    registerEntityClass(schema, BcfDirection.class);
    registerEntityClass(schema, BcfLine.class);
    registerEntityClass(schema, BcfOrthogonalCamera.class);
    registerEntityClass(schema, BcfPerspectiveCamera.class);
    registerEntityClass(schema, BcfDocumentReference.class);
    registerEntityClass(schema, BcfPoint.class);
    registerEntityClass(schema, BcfVector.class);
    registerEntityClass(schema, BcfSnapshot.class);
    OClass projectClass = registerEntityClass(schema, BcfProject.class);
    OClass extensionsClass = registerEntityClass(schema, BcfExtensions.class);
    OClass topicClass = registerEntityClass(schema, BcfTopic.class);
    OClass commentClass = registerEntityClass(schema, BcfComment.class);
    OClass viewpointClass = registerEntityClass(schema, BcfViewpoint.class);

    createIndex(projectClass, "BcfProjectIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    createIndex(extensionsClass, "BcfExtensionsIdIdx", OClass.INDEX_TYPE.UNIQUE, "projectId");
    createIndex(topicClass, "BcfTopicIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    createIndex(topicClass, "BcfTopicTitleIdx", OClass.INDEX_TYPE.NOTUNIQUE, "title");
    createIndex(commentClass, "BcfCommentIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    createIndex(commentClass, "BcfCommentTopicIdIdx", OClass.INDEX_TYPE.NOTUNIQUE, "topicId");
    createIndex(viewpointClass, "BcfViewpointIdIdx", OClass.INDEX_TYPE.UNIQUE, "id");
    createIndex(viewpointClass, "BcfViewpointTopicIdIdx", OClass.INDEX_TYPE.NOTUNIQUE, "topicId");
  }

  @Override
  public BcfDaoConnection getConnection()
  {
    return new BcfOrientDaoConnection(getOrientConnection());
  }
}
