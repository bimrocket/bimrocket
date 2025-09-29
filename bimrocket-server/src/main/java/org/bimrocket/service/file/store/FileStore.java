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
package org.bimrocket.service.file.store;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.FindOptions;
import org.bimrocket.service.file.Lock;
import org.bimrocket.service.file.Path;
import org.bimrocket.service.file.Metadata;

/**
 *
 * @author realor
 */
public interface FileStore
{
  List<Metadata> find(Path path, FindOptions options);

  Metadata get(Path path);

  Metadata makeCollection(Path path);

  InputStream read(Path path) throws IOException;

  Metadata write(Path path, InputStream is, String contentType)
    throws IOException;

  void delete(Path path) throws IOException;

  Map<String, Object> getProperties(Path path, String ...names);

  void setProperties(Path path, Map<String, Object> properties);

  ACL getACL(Path path);

  void setACL(Path path, ACL acl);

  Lock getLock(Path path);

  void setLock(Path path, Lock lock);

  void move(Path sourcePath, Path destPath) throws IOException;

  void copy(Path sourcePath, Path destPath) throws IOException;
}
