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
package org.bimrocket.service.file.store.filesystem;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.module.SimpleModule;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import org.apache.commons.collections.map.LRUMap;
import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.util.MutableACL;
import org.bimrocket.service.file.util.MutableACLDeserializer;
import org.bimrocket.service.file.util.MutableACLSerializer;

/**
 *
 * @author realor
 */
public class ACLFile
{
  public static final String ACL_FILENAME = ".acl";
  public static final String ANY_FILENAME = "*";

  private static final int MAX_SIZE = 10;
  private static final LRUMap cache = new LRUMap(MAX_SIZE);

  private final File aclFile;
  private FileMap fileMap;
  private long lastLoad;

  ACLFile(File directory)
  {
    this.aclFile = new File(directory, ACL_FILENAME);
  }

  public File getFile()
  {
    return aclFile;
  }

  public synchronized void setACL(String filename, ACL acl)
  {
    prepare();
    MutableACL mutAcl = fileMap.get(filename);
    if (mutAcl == null)
    {
      mutAcl = new MutableACL();
      fileMap.put(filename, mutAcl);
    }
    mutAcl.copy(acl);
  }

  public synchronized ACL getACL(String filename)
  {
    prepare();
    ACL acl = fileMap.get(filename);
    if (acl == null && !ANY_FILENAME.equals(filename))
    {
      acl = fileMap.get(ANY_FILENAME);
    }
    return acl;
  }

  /* private methods */

  private void prepare()
  {
    if (aclFile.exists())
    {
      if (fileMap == null || aclFile.lastModified() != lastLoad)
      {
        load();
        lastLoad = aclFile.lastModified();
      }
    }
    else
    {
      fileMap = new FileMap();
    }
  }

  public synchronized void load()
  {
    try
    {
      ObjectMapper mapper = new ObjectMapper();
      SimpleModule module = new SimpleModule();
      module.addDeserializer(MutableACL.class, new MutableACLDeserializer());
      mapper.registerModule(module);

      fileMap = mapper.readValue(aclFile, FileMap.class);
      if (fileMap == null) fileMap = new FileMap();
    }
    catch (IOException | IllegalArgumentException ex)
    {
      throw new RuntimeException(ex);
    }
  }

  public synchronized void save()
  {
    if (fileMap != null)
    {
      try
      {
        if (!aclFile.exists())
        {
          aclFile.getParentFile().mkdirs();
        }

        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addSerializer(MutableACL.class, new MutableACLSerializer());
        mapper.registerModule(module);
        mapper.enable(SerializationFeature.INDENT_OUTPUT);

        mapper.writeValue(aclFile, fileMap);
      }
      catch (IOException ex)
      {
        throw new RuntimeException(ex);
      }
    }
  }

  public static class FileMap extends HashMap<String, MutableACL>
  {
    private static final long serialVersionUID = 1L;
  }

  public static synchronized ACLFile getInstance(File file)
  {
    File dir;

    if (file.isFile())
    {
      dir = file.getParentFile();
    }
    else
    {
      dir = file;
    }

    String dirPath = dir.getAbsolutePath();

    ACLFile aclFile = (ACLFile)cache.get(dirPath);
    if (aclFile == null)
    {
      aclFile = new ACLFile(dir);
      cache.put(dirPath, aclFile);
    }
    return aclFile;
  }
}


