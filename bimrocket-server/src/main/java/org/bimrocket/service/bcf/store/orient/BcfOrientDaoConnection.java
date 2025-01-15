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
import org.bimrocket.api.bcf.BcfComment;
import org.bimrocket.api.bcf.BcfDocumentReference;
import org.bimrocket.api.bcf.BcfExtensions;
import org.bimrocket.api.bcf.BcfProject;
import org.bimrocket.api.bcf.BcfTopic;
import org.bimrocket.api.bcf.BcfViewpoint;
import org.bimrocket.dao.Dao;
import org.bimrocket.dao.orient.OrientDao;
import org.bimrocket.dao.orient.OrientDaoConnection;
import org.bimrocket.service.bcf.store.BcfDaoConnection;

/**
 *
 * @author realor
 */
public class BcfOrientDaoConnection extends OrientDaoConnection
  implements BcfDaoConnection
{
  BcfOrientDaoConnection(ODatabaseObject conn)
  {
    super(conn);
  }

  @Override
  public Dao<BcfProject> getProjectDao()
  {
    return new OrientDao<>(conn, BcfProject.class);
  }

  @Override
  public Dao<BcfExtensions> getExtensionsDao()
  {
    return new OrientDao<>(conn, BcfExtensions.class);
  }

  @Override
  public Dao<BcfTopic> getTopicDao()
  {
    return new OrientDao<>(conn, BcfTopic.class);
  }

  @Override
  public Dao<BcfComment> getCommentDao()
  {
    return new OrientDao<>(conn, BcfComment.class);
  }

  @Override
  public Dao<BcfViewpoint> getViewpointDao()
  {
    return new OrientDao<>(conn, BcfViewpoint.class);
  }

  @Override
  public Dao<BcfDocumentReference> getDocumentReferenceDao()
  {
    return new OrientDao<>(conn, BcfDocumentReference.class);
  }
}
