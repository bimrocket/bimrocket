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
package org.bimrocket.api.cloudfs;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import org.apache.commons.collections.map.LRUMap;

/**
 *
 * @author realor
 */
public class ACL
{
  public static String READ_ACTION = "READ";
  public static String WRITE_ACTION = "WRITE";
  private static final String ACL_FILENAME = ".acl";
  private static final int MAX_SIZE = 10;

  private static final LRUMap cache = new LRUMap(MAX_SIZE);

  private final File directory;
  private final File aclFile;
  private FileMap acl;
  private long lastLoad;

  ACL(File directory)
  {
    this.directory = directory;
    this.aclFile = new File(directory, ACL_FILENAME);
  }

  public File getDirectory()
  {
    return directory;
  }

  public File getACLFile()
  {
    return aclFile;
  }

  public synchronized void grant(String filename, String action, String role)
    throws IOException
  {
    prepare();
    ActionMap actionMap = acl.get(filename);
    if (actionMap == null)
    {
      actionMap = new ActionMap();
      acl.put(filename, actionMap);
    }
    Set<String> roles = actionMap.get(action);
    if (roles == null)
    {
      roles = new HashSet<>();
      actionMap.put(action, roles);
    }
    roles.add(role);
  }

  public synchronized void revoke(String filename, String action, String role)
    throws IOException
  {
    prepare();
    ActionMap actionMap = acl.get(filename);
    if (actionMap != null)
    {
      Set<String> roles = actionMap.get(action);
      if (roles != null)
      {
        roles.remove(role);
        if (roles.isEmpty())
        {
          actionMap.remove(action);
          if (actionMap.isEmpty())
          {
            acl.remove(filename);
          }
        }
      }
    }
  }

  public synchronized void revokeAll(String filename) throws IOException
  {
    prepare();
    acl.remove(filename);
  }

  public synchronized Set<String> getRoles(String filename, String action)
    throws IOException
  {
    prepare();
    ActionMap actionMap = acl.get(filename);
    if (actionMap == null) return Collections.emptySet();
    Set<String> roles = actionMap.get(action);
    return roles == null ? Collections.emptySet() : roles;
  }

  /* private methods */

  private void prepare() throws IOException
  {
    if (aclFile.exists())
    {
      if (acl == null || aclFile.lastModified() != lastLoad)
      {
        load();
        lastLoad = aclFile.lastModified();
      }
    }
    else
    {
      acl = new FileMap();
    }
  }

  public synchronized void load() throws IOException
  {
    ObjectMapper mapper = new ObjectMapper();
    try
    {
      JsonNode node = mapper.readTree(aclFile);
      acl = mapper.convertValue(node, new TypeReference<FileMap>(){});
      if (acl == null) acl = new FileMap();
    }
    catch (IllegalArgumentException ex)
    {
      throw new RuntimeException(ex);
    }
  }

  public synchronized void save() throws IOException
  {
    if (acl != null)
    {
      if (!aclFile.exists())
      {
        aclFile.getParentFile().mkdirs();
      }
      ObjectMapper mapper = new ObjectMapper();
      mapper.writeValue(aclFile, acl);
    }
  }

  public static class ActionMap extends HashMap<String, Set<String>>
  {
    private static final long serialVersionUID = 1L;
  }

  public static class FileMap extends HashMap<String, ActionMap>
  {
    private static final long serialVersionUID = 1L;
  }

  public static synchronized ACL getInstance(String path)
  {
    ACL acl = (ACL)cache.get(path);
    if (acl == null)
    {
      acl = new ACL(new File(path));
      cache.put(path, acl);
    }
    return acl;
  }
}


