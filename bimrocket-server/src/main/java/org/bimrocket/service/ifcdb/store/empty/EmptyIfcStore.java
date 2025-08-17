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
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.bimrocket.api.ifcdb.IfcdbCommand;
import org.bimrocket.api.ifcdb.IfcdbModel;
import org.bimrocket.api.ifcdb.IfcdbVersion;
import org.bimrocket.dao.expression.Expression;
import org.bimrocket.dao.expression.OrderByExpression;
import org.bimrocket.express.ExpressSchema;
import org.bimrocket.service.ifcdb.store.IfcStore;

/**
 *
 * @author realor
 */
public class EmptyIfcStore implements IfcStore
{
  @Override
  public void createSchema(ExpressSchema schema) throws IOException
  {
  }

  @Override
  public List<String> getSupportedQueryLanguages()
  {
    return Collections.emptyList();
  }

  @Override
    public List<IfcdbModel> getModels(ExpressSchema schema,
    Expression filter, List<OrderByExpression> orderByList,
    Set<String> roleIds)
  {
    return Collections.emptyList();
  }

  @Override
  public List<IfcdbVersion> getModelVersions(ExpressSchema schema, String modelId)
  {
    return Collections.emptyList();
  }

  @Override
  public void downloadModel(ExpressSchema schema, String modelId, int version, File ifcFile)
    throws IOException
  {
  }

  @Override
  public IfcdbModel uploadModel(ExpressSchema schema, File ifcFile)
    throws IOException
  {
    return new IfcdbModel();
  }

  @Override
  public IfcdbModel updateModel(ExpressSchema schema, IfcdbModel model)
  {
    return model;
  }

  @Override
  public boolean deleteModel(ExpressSchema schema, String modelId, int version)
  {
    return false;
  }

  @Override
  public void execute(ExpressSchema schema, IfcdbCommand command, File file)
    throws IOException
  {
  }
}
