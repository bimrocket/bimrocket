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
package org.bimrocket.service.file.util;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.Lock;
import org.bimrocket.service.file.Metadata;
import org.bimrocket.service.file.Path;

/**
 *
 * @author realor
 */
public class MutableMetadata implements Metadata
{
  private Path path;
  private String name;
  private boolean collection;
  private long creationDate;
  private long lastModifiedDate;
  private String etag;
  private String contentType;
  private long contentLength;
  private ACL acl;
  private Lock lock;
  // dead properties
  private final Map<String, Object> properties = new HashMap<>();

  @Override
  public Path getPath()
  {
    return path;
  }

  public void setPath(Path path)
  {
    this.path = path;
  }

  @Override
  public String getName()
  {
    return name;
  }

  public void setName(String name)
  {
    this.name = name;
  }

  @Override
  public boolean isCollection()
  {
    return collection;
  }

  public void setCollection(boolean collection)
  {
    this.collection = collection;
  }

  @Override
  public long getCreationDate()
  {
    return creationDate;
  }

  public void setCreationDate(long creationDate)
  {
    this.creationDate = creationDate;
  }

  @Override
  public long getLastModifiedDate()
  {
    return lastModifiedDate;
  }

  public void setLastModifiedDate(long lastModifiedDate)
  {
    this.lastModifiedDate = lastModifiedDate;
  }

  @Override
  public String getEtag()
  {
    return etag;
  }

  public void setEtag(String etag)
  {
    this.etag = etag;
  }

  @Override
  public String getContentType()
  {
    return contentType;
  }

  public void setContentType(String contentType)
  {
    this.contentType = contentType;
  }

  @Override
  public long getContentLength()
  {
    return contentLength;
  }

  public void setContentLength(long contentLength)
  {
    this.contentLength = contentLength;
  }

  @Override
  public ACL getAcl()
  {
    return acl;
  }

  public void setAcl(ACL acl)
  {
    this.acl = acl;
  }

  @Override
  public Lock getLock()
  {
    return lock;
  }

  public void setLock(Lock lock)
  {
    this.lock = lock;
  }

  @Override
  public Collection<String> getPropertyNames()
  {
    return Collections.unmodifiableSet(properties.keySet());
  }

  @Override
  public Object getProperty(String name)
  {
    return properties.get(name);
  }

  public void setProperty(String name, Object value)
  {
    properties.put(name, value);
  }
}
