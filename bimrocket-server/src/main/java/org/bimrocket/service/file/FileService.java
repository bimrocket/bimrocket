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
package org.bimrocket.service.file;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.bimrocket.api.security.User;
import org.bimrocket.exception.AccessDeniedException;
import org.bimrocket.exception.NotAuthorizedException;
import org.bimrocket.service.file.exception.LockedFileException;
import org.bimrocket.service.file.store.FileStore;
import org.bimrocket.service.file.store.filesystem.FileSystemFileStore;
import org.bimrocket.service.file.util.MutableACL;

import static org.bimrocket.service.file.Privilege.*;
import static org.bimrocket.service.security.SecurityConstants.ADMIN_ROLE;
import static org.bimrocket.service.security.SecurityConstants.AUTHENTICATED_ROLE;
import org.bimrocket.service.security.SecurityService;
import org.eclipse.microprofile.config.Config;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class FileService
{
  static final Logger LOGGER =
    Logger.getLogger(FileService.class.getName());

  static final String BASE = "services.file.";

  @Inject
  Config config;

  @Inject
  SecurityService securityService;

  FileStore store;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.FINE, "Init ResourceService");

    CDI<Object> cdi = CDI.current();

    try
    {
      @SuppressWarnings("unchecked")
      Class<FileStore> storeClass =
        config.getValue(BASE + "store.class", Class.class);
      store = cdi.select(storeClass).get();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, "Error initializing FileStore: {0}: {1}",
        new Object[] {
          config.getOptionalValue(BASE + "store.class", String.class).orElse(null),
          ex.toString()
      });
      store = new FileSystemFileStore();
    }
    // create default folders
    List<String> folders = config.getValues(BASE + "folders", String.class);
    FindOptions options = new FindOptions();
    options.includeRoot = true;
    options.depth = 0;
    for (String folder : folders)
    {
      Path path = new Path(folder);
      if (store.find(path, options).isEmpty())
      {
        store.makeCollection(path);
      }
    }
    // set default ACL
    Path rootPath = new Path("/");
    ACL acl = store.getACL(rootPath);
    if (acl == null)
    {
      MutableACL macl = new MutableACL();
      macl.grant(AUTHENTICATED_ROLE, WRITE);
      store.setACL(rootPath, macl);
    }
  }

  public List<Metadata> find(Path path, FindOptions options)
  {
    LOGGER.log(Level.FINE, "find {0}", path);

    checkAccess(path, READ);

    return store.find(path, options);
  }

  public Metadata get(Path path)
  {
    return get(path, null);
  }

  public Metadata get(Path path, Privilege privilege)
  {
    LOGGER.log(Level.FINE, "get {0}", path);

    if (privilege != null) checkAccess(path, privilege);

    return store.get(path);
  }

  public Metadata makeCollection(Path path)
  {
    LOGGER.log(Level.FINE, "makeCollection {0}", path);

    checkAccess(path, WRITE);

    Metadata metadata = store.makeCollection(path);

    MutableACL acl = new MutableACL();

    acl.grant(securityService.getCurrentUser().getId(), List.of(READ, WRITE, READ_ACL, WRITE_ACL));

    store.setACL(path, acl);

    return metadata;
  }

  public InputStream read(Path path) throws IOException
  {
    return read(path, READ);
  }

  public InputStream read(Path path, Privilege privilege) throws IOException
  {
    LOGGER.log(Level.FINE, "read {0}", path);

    if (privilege != null) checkAccess(path, privilege);

    return store.read(path);
  }

  public Metadata write(Path path, InputStream is, String contentType)
    throws IOException, LockedFileException
  {
    return write(path, is, contentType, WRITE);
  }

  public Metadata write(Path path, InputStream is, String contentType,
    Privilege privilege) throws IOException, LockedFileException
  {
    LOGGER.log(Level.FINE, "write {0}", path);

    if (privilege != null) checkAccess(path, privilege);

    checkLock(path);

    return store.write(path, is, contentType);
  }

  public void delete(Path path) throws LockedFileException
  {
    LOGGER.log(Level.FINE, "delete {0}", path);

    checkAccess(path, WRITE);

    checkLock(path);

    store.delete(path);
  }

  public Map<String, Object> getProperties(Path path, String ...names)
  {
    LOGGER.log(Level.FINE, "getProperties {0}", path);

    return store.getProperties(path, names);
  }

  public void setProperties(Path path, Map<String, Object> properties)
  {
    LOGGER.log(Level.FINE, "setProperties {0}", path);

    store.setProperties(path, properties);
  }

  public ACL getACL(Path path)
  {
    LOGGER.log(Level.FINE, "getAcl {0}", path);

    checkAccess(path, READ_ACL);

    return store.getACL(path);
  }

  public void setACL(Path path, ACL acl)
  {
    LOGGER.log(Level.FINE, "setAcl {0}", path);

    checkAccess(path, WRITE_ACL);

    store.setACL(path, acl);
  }

  public Lock getLock(Path path)
  {
    LOGGER.log(Level.FINE, "getLock {0}", path);

    checkAccess(path, READ);

    return store.getLock(path);
  }

  public void lock(Path path)
  {
    LOGGER.log(Level.FINE, "lock {0}", path);

    checkAccess(path, WRITE);

    User user = securityService.getCurrentUser();

    Lock lock = store.getLock(path);
    if (lock == null)
    {
      lock = new Lock(user.getId(), 0);
      store.setLock(path, lock);
    }
    else
    {
      if (!lock.getUserId().equals(user.getId()))
        throw new LockedFileException(path, lock);
    }
  }

  public void unlock(Path path)
  {
    LOGGER.log(Level.FINE, "unlock {0}", path);

    Lock lock = store.getLock(path);
    if (lock != null)
    {
      User user = securityService.getCurrentUser();

      if (!lock.getUserId().equals(user.getId())
          && !user.getRoleIds().contains(ADMIN_ROLE))
        throw new AccessDeniedException("Can not unlock");

      store.setLock(path, null);
    }
  }

  public void move(Path sourcePath, Path destPath) throws IOException
  {
    LOGGER.log(Level.FINE, "move {0} -> {1}", new Object[]{ sourcePath, destPath });

    checkAccess(sourcePath, WRITE);
    checkAccess(destPath, WRITE);

    checkLock(sourcePath);
    checkLock(destPath);

    store.move(sourcePath, destPath);
  }

  public void copy(Path sourcePath, Path destPath) throws IOException
  {
    LOGGER.log(Level.FINE, "copy {0} -> {1}", new Object[]{ sourcePath, destPath });

    checkAccess(sourcePath, READ);
    checkAccess(destPath, WRITE);

    checkLock(sourcePath);
    checkLock(destPath);

    store.copy(sourcePath, destPath);
  }

  // internal methods

  void checkAccess(Path path, Privilege privilege) throws NotAuthorizedException
  {
    User user = securityService.getCurrentUser();

    if (user.getRoleIds().contains(ADMIN_ROLE)) return;

    Set<String> fileRoles = Collections.emptySet();

    while (path != null && fileRoles.isEmpty())
    {
      ACL acl = store.getACL(path);
      if (acl != null)
      {
        fileRoles = acl.getRoleIdsForPrivilege(privilege);
      }
      path = path.getParent();
    }

    boolean accessAllowed = fileRoles.isEmpty() ||
      !Collections.disjoint(fileRoles, user.getRoleIds());

    if (!accessAllowed) throw new NotAuthorizedException();
  }

  void checkLock(Path path)
  {
    Lock lock = store.getLock(path);
    if (lock != null)
    {
      User user = securityService.getCurrentUser();
      if (!lock.getUserId().equals(user.getId()))
        throw new LockedFileException(path, lock);
    }
  }
}
