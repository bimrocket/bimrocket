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
package org.bimrocket.service.ifcdb.store.empty;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.service.ifcdb.store.IfcData;
import org.bimrocket.service.ifcdb.store.IfcdbConnection;

/**
 *
 * @author realor
 */
public class EmptyIfcConnection implements IfcdbConnection
{
  @Override
  public ExpressSchema getSchema()
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public void createSchema()
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public List<IfcdbModel> findModels(Expression filter,
    List<OrderByExpression> orderByList, Set<String> roles)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public List<IfcdbVersion> getModelVersions(String modelId)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcdbModel createModel(IfcdbModel model)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcdbVersion createModelVersion(String modelId, IfcdbVersion ifcdbVersion)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcdbModel getModel(String modelId)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcdbModel updateModel(IfcdbModel model)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public boolean deleteModel(String modelId, int version)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcData createData()
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcData loadData(String modelId, int version)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public void saveData(String modelId, int version, IfcData data)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public IfcData queryData(String query, String language)
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public void execute(String query, String language, File outputFile)
    throws IOException
  {
    throw new UnsupportedOperationException("Not supported yet.");
  }

  @Override
  public void begin()
  {
  }

  @Override
  public void commit()
  {
  }

  @Override
  public void rollback()
  {
  }

  @Override
  public void close()
  {
  }
}
