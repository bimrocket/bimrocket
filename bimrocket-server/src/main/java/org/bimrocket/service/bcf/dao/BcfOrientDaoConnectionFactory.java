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
package org.bimrocket.service.bcf.dao;

import com.orientechnologies.orient.core.db.object.ODatabaseObject;
import com.orientechnologies.orient.core.entity.OEntityManager;
import org.bimrocket.api.bcf.*;
import org.bimrocket.dao.orientdb.OrientDaoConnectionFactory;

/**
 *
 * @author realor
 */
public class BcfOrientDaoConnectionFactory
  extends OrientDaoConnectionFactory
{
  @Override
  protected void registerEntityClasses(ODatabaseObject db)
  {
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
}
