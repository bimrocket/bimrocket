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

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.apache.commons.io.IOUtils;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.FindOptions;
import org.bimrocket.service.file.Lock;
import org.bimrocket.service.file.Path;
import org.bimrocket.service.file.Metadata;
import org.bimrocket.service.file.MimeTypeMap;
import org.bimrocket.service.file.store.FileStore;
import org.bimrocket.service.file.util.MutableMetadata;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

/**
 *
 * @author realor
 */
public class FileSystemFileStore implements FileStore
{
  static final String BASE = "services.file.store.filesystem.";

  File baseDir;

  @PostConstruct
  public void init()
  {
    Config config = ConfigProvider.getConfig();
    String directory = config.getValue(BASE + "directory", String.class);
    this.baseDir = new File(directory);

    if (!baseDir.exists())
    {
      baseDir.mkdirs();
    }
  }

  @Override
  public List<Metadata> find(Path path, FindOptions options)
  {
    File file = getFile(path);

    if (file.isDirectory())
    {
      List<Metadata> metadatas = new ArrayList<>();
      if (options.isIncludeRoot())
      {
        metadatas.add(getMetadata(file));
      }

      int depth = options.getDepth();
      if (depth > 0)
      {
        exploreFiles(file, depth, metadatas);
      }
      return metadatas;
    }
    else if (file.exists() && isValidFile(file))
    {
      return List.of(getMetadata(file));
    }
    else
    {
      return Collections.emptyList();
    }
  }

  @Override
  public Metadata get(Path path)
  {
    File file = getFile(path);

    if (!file.exists()) throw new NotFoundException("File do not exists");

    return getMetadata(file);
  }

  @Override
  public Metadata makeCollection(Path path)
  {
    File file = getFile(path);

    if (file.exists()) throw new InvalidRequestException("File already exists");

    if (!isValidFile(file)) throw new InvalidRequestException("Invalid name");

    file.mkdirs();

    return getMetadata(file);
  }

  @Override
  public InputStream read(Path path) throws IOException
  {
    File file = getFile(path);

    if (file.isDirectory() || !(isValidFile(file) || isACLFile(file)))
      throw new InvalidRequestException("Invalid path");

    FileInputStream fis = new FileInputStream(file);

    return fis;
  }

  @Override
  public Metadata write(Path path, InputStream is, String contentType)
    throws IOException
  {
    File file = getFile(path);

    if (file.isDirectory() || !(isValidFile(file) || isACLFile(file)))
      throw new InvalidRequestException("Invalid path");

    try (FileOutputStream fos = new FileOutputStream(file))
    {
      IOUtils.copy(is, fos);
    }
    finally
    {
      is.close();
    }
    return getMetadata(file);
  }

  @Override
  public void delete(Path path) throws IOException {
    File file = getFile(path);

    if (file.exists())
    {
      if (file.isDirectory())
      {
        File[] childFiles = file.listFiles();
        if (childFiles.length == 1 && isACLFile(childFiles[0]))
        {
          childFiles[0].delete();
        }
      }

      if (!file.delete())
        throw new IOException("Folder not Empty.");
    }
  }

  @Override
  public Map<String, Object> getProperties(Path path, String... names)
  {
    return null;
  }

  @Override
  public void setProperties(Path path, Map<String, Object> properties)
  {
  }

  @Override
  public ACL getACL(Path path)
  {
    File file = getFile(path);
    if (!file.exists()) return null;

    ACLFile aclFile = ACLFile.getInstance(file);
    String filename = file.isFile() ? file.getName() : ACLFile.ANY_FILENAME;

    return aclFile.getACL(filename);
  }

  @Override
  public void setACL(Path path, ACL acl)
  {
    File file = getFile(path);
    if (!file.exists()) return; // may throw exception

    ACLFile aclFile = ACLFile.getInstance(file);
    String filename = file.isFile() ? file.getName() : ACLFile.ANY_FILENAME;

    aclFile.setACL(filename, acl);
    aclFile.save();
  }

  @Override
  public Lock getLock(Path path)
  {
    return null;
  }

  @Override
  public void setLock(Path path, Lock lock)
  {
  }

  @Override
  public void move(Path sourcePath, Path destPath) throws IOException
  {
    File sourceFile = getFile(sourcePath);
    File destFile = getFile(destPath);

    if (isACLFile(sourceFile) || isACLFile(destFile))
      throw new InvalidRequestException("Invalid path");

    if (!sourceFile.renameTo(destFile))
      throw new IOException("Move opration failed");
  }

  @Override
  public void copy(Path sourcePath, Path destPath) throws IOException
  {
    File sourceFile = getFile(sourcePath);
    File destFile = getFile(destPath);

    if (isACLFile(sourceFile) || isACLFile(destFile) || sourceFile.isDirectory())
      throw new InvalidRequestException("Invalid path");

    if (destFile.isDirectory())
    {
      destFile = new File(destFile, sourceFile.getName());
      if (destFile.exists())
        throw new InvalidRequestException("File already exists");
    }
    Files.copy(sourceFile.toPath(), destFile.toPath(),
      StandardCopyOption.REPLACE_EXISTING);
  }

  /* internal methods */

  boolean isValidFile(File file)
  {
    return !file.isHidden() &&
      !file.getName().startsWith(".") &&
      !file.getName().equals(ACLFile.ANY_FILENAME);
  }

  boolean isACLFile(File file)
  {
    return file.getName().equals(ACLFile.ACL_FILENAME);
  }

  // depth > 0
  void exploreFiles(File dir, int depth, List<Metadata> metadatas)
  {
    File[] files = dir.listFiles(); // optional

    for (File childFile : files)
    {
      if (isValidFile(childFile))
      {
        metadatas.add(getMetadata(childFile));
        if (childFile.isDirectory() && depth > 1)
        {
          exploreFiles(childFile, depth - 1, metadatas);
        }
      }
    }
  }

  File getFile(Path path)
  {
    return new File(baseDir, path.toString());
  }

  Metadata getMetadata(File file)
  {
    try
    {
      java.nio.file.Path filePath = file.toPath();
      java.nio.file.Path baseDirPath = baseDir.toPath();
      String relPath = baseDirPath.relativize(filePath).toString();
      relPath = "/" + relPath.replace("\\", "/");

      BasicFileAttributes attributes =
        Files.readAttributes(filePath, BasicFileAttributes.class);

      MutableMetadata metadata = new MutableMetadata();
      metadata.setPath(new Path(relPath));
      metadata.setCollection(file.isDirectory());
      metadata.setCreationDate(attributes.creationTime().toMillis());
      metadata.setLastModifiedDate(attributes.lastModifiedTime().toMillis());
      metadata.setContentType(file.isDirectory() ? null : getContentType(file));
      metadata.setContentLength(file.isDirectory() ? 0 : file.length());

      return metadata;
    }
    catch (IOException ex)
    {
      throw new RuntimeException(ex);
    }
  }

  String getContentType(File file)
  {
    String filename = file.getName();
    int index = filename.lastIndexOf(".");
    String extension;
    if (index != -1)
    {
      extension = filename.substring(index + 1);
    }
    else
    {
      extension = filename;
    }
    return MimeTypeMap.getContentType(extension);
  }
}
