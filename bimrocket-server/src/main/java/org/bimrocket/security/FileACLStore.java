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
package org.bimrocket.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

/**
 *
 * @author realor
 */
public class FileACLStore implements ACLStore
{
  private ResourceMap acl;
  private String filename;
  private long lastLoad;

  public String getFilename()
  {
    return filename;
  }

  public void setFilename(String filename)
  {
    this.filename = filename;
  }

  @Override
  public synchronized void grant(String resource, String action, String role)
    throws IOException
  {
    prepare();
    ActionMap actionMap = acl.get(resource);
    if (actionMap == null)
    {
      actionMap = new ActionMap();
      acl.put(resource, actionMap);
    }
    Set<String> roles = actionMap.get(action);
    if (roles == null)
    {
      roles = new HashSet<>();
      actionMap.put(action, roles);
    }
    roles.add(role);
  }

  @Override
  public synchronized void revoke(String resource, String action, String role)
    throws IOException
  {
    prepare();
    ActionMap actionMap = acl.get(resource);
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
            acl.remove(resource);
          }
        }
      }
    }
  }

  @Override
  public synchronized void revokeAll(String resource) throws IOException
  {
    prepare();
    acl.remove(resource);
  }

  @Override
  public synchronized Set<String> getRoles(String resource, String action)
    throws IOException
  {
    prepare();
    ActionMap actionMap = acl.get(resource);
    if (actionMap == null) return Collections.emptySet();
    Set<String> roles = actionMap.get(action);
    return roles == null ? Collections.emptySet() : roles;
  }

  private void prepare() throws IOException
  {
    File file = getFile();
    if (file.lastModified() != lastLoad)
    {
      load();
      lastLoad = file.lastModified();
    }
  }

  public synchronized void load() throws IOException
  {
    ObjectMapper mapper = new ObjectMapper();
    try
    {
      File file = getFile();
      JsonNode node = mapper.readTree(file);
      acl = mapper.convertValue(node, new TypeReference<ResourceMap>(){});
      if (acl == null) acl = new ResourceMap();
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
      ObjectMapper mapper = new ObjectMapper();
      File file = getFile();
      mapper.writeValue(file, acl);
    }
  }

  private File getFile() throws IOException
  {
    File file = new File(filename);
    if (!file.exists())
    {
      file.createNewFile();
    }
    return file;
  }

  public static class ActionMap extends HashMap<String, Set<String>>
  {
    private static final long serialVersionUID = 1L;
  }

  public static class ResourceMap extends HashMap<String, ActionMap>
  {
    private static final long serialVersionUID = 1L;
  }

  public static void main(String[] args) throws IOException
  {
    FileACLStore store = new FileACLStore();
    store.setFilename("C:/Users/realor/test.txt");

    store.grant("/test/alfa1.ifc", READ_ACTION, "EMPLEAT");
    store.grant("/test/alfa2.ifc", READ_ACTION, "realor");
    store.grant("/test/alfa3.ifc", WRITE_ACTION, "INFORMATICA");
    store.grant("/test/alfa3.ifc", WRITE_ACTION, "UIB");
    store.grant("/test/alfa3.ifc", WRITE_ACTION, "ALCALDIA");
    store.revokeAll("/test/alfa3.ifc");

    store.save();
  }
}


