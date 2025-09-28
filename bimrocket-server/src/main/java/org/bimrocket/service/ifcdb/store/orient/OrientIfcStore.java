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
package org.bimrocket.service.ifcdb.store.orient;

import com.orientechnologies.orient.core.db.document.ODatabaseDocument;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Set;
import java.util.logging.Logger;
import org.bimrocket.dao.orient.OrientPoolManager;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.service.ifcdb.store.IfcdbStore;
import org.bimrocket.service.ifcdb.store.IfcdbConnection;

/**
 *
 * @author realor
 */
public class OrientIfcStore implements IfcdbStore
{
  static final Logger LOGGER =
    Logger.getLogger(OrientIfcStore.class.getName());

  static final List<String> supportedQueryLanguages = List.of("OrientSQL");
  static final Set<String> bsplineSurfaceClasses = Set.of(
    "IfcBSplineSurface",
    "IfcBSplineSurfaceWithKnots",
    "IfcRationalBSplineSurfaceWithKnots");

  @Inject
  OrientPoolManager poolManager;

  @Override
  public List<String> getSupportedQueryLanguages()
  {
    return supportedQueryLanguages;
  }

  @Override
  public IfcdbConnection getConnection(ExpressSchema schema)
  {
    String dbAlias = schema.getName();
    ODatabaseDocument db = poolManager.getDocumentConnection(dbAlias);

    return new OrientIfcConnection(db, schema);
  }

  @Override
  public IfcdbConnection getConnection()
  {
    throw new UnsupportedOperationException("Schema must be specified.");
  }

  @Override
  public void close()
  {
    // close by orient pool
  }
}
