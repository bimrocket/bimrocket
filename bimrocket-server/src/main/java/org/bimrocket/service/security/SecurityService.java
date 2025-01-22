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
package org.bimrocket.service.security;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.Stack;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.apache.commons.lang3.StringUtils;
import org.bimrocket.api.security.Role;
import org.bimrocket.api.security.User;
import org.bimrocket.dao.Dao;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotAuthorizedException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.odata.SimpleODataParser;
import org.bimrocket.service.security.store.SecurityDaoStore;
import org.bimrocket.service.security.store.empty.SecurityEmptyDaoStore;
import org.eclipse.microprofile.config.Config;
import org.bimrocket.service.security.store.SecurityDaoConnection;
import org.bimrocket.util.ExpiringCache;
import static org.bimrocket.service.security.SecurityConstants.*;
import static org.bimrocket.util.TextUtils.getISODate;
import static java.lang.Boolean.FALSE;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class SecurityService
{
  static final Logger LOGGER =
    Logger.getLogger(SecurityService.class.getName());

  static final String BASE = "services.security.";
  static final String USER_REQUEST_ATTRIBUTE = "_user";

  static final Map<String, String> userFieldMap = new ConcurrentHashMap<>();
  static final Map<String, String> roleFieldMap = new ConcurrentHashMap<>();

  // Exceptions

  static final String USER_ALREADY_EXISTS =
    "SEC001: User already exists.";
  static final String USER_NOT_FOUND =
    "SEC002: User not found.";
  static final String USER_IS_NOT_ACTIVE =
    "SEC003: User is not active.";
  static final String CAN_NOT_CHANGE_PASSWORD =
    "SEC004: Can not change password.";
  static final String ID_IS_REQUIRED =
    "SEC005: User id is required.";
  static final String INVALID_PASSWORD_FORMAT =
    "SEC006: Invalid password format.";

  static
  {
    userFieldMap.put("id", "id");
    userFieldMap.put("display_name", "displayName");
    userFieldMap.put("email", "email");

    roleFieldMap.put("id", "id");
    roleFieldMap.put("description", "description");
  }

  @Inject
  Instance<HttpServletRequest> requestInstance;

  @Inject
  Config config;

  SecurityDaoStore daoStore;
  LdapConnector ldapConnector;

  String adminPassword;

  ExpiringCache<String> authorizationCache;
  ExpiringCache<User> userCache;
  ExpiringCache<Role> roleCache;

  long authorizationCacheTimeout; // seconds
  long userCacheTimeout; // seconds
  long roleCacheTimeout; // seconds

  User anonymousUser;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init SecurityService");

    boolean ldapEnabled = config.getValue(BASE + "ldap.enabled", Boolean.class);

    CDI<Object> cdi = CDI.current();

    if (ldapEnabled)
    {
      ldapConnector = cdi.select(LdapConnector.class).get();
      LOGGER.log(Level.INFO, "LDAP enabled: {0}", ldapConnector.getLdapUrl());
    }

    try
    {
      @SuppressWarnings("unchecked")
      Class<SecurityDaoStore> storeClass =
        config.getValue(BASE + "store.class", Class.class);
      daoStore = cdi.select(storeClass).get();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, "Invalid SecurityDaoStore: {0}",
        config.getOptionalValue(BASE + "store.class", String.class).orElse(null));
      daoStore = new SecurityEmptyDaoStore();
    }

    LOGGER.log(Level.INFO, "SecurityDaoStore: {0}", daoStore.getClass());

    adminPassword = config.getValue(BASE + "adminPassword", String.class);

    authorizationCacheTimeout = config.getValue(BASE + "authorizationCacheTimeout", Long.class);
    authorizationCache = new ExpiringCache<>(authorizationCacheTimeout * 1000);
    LOGGER.log(Level.INFO, "authorizationCacheTimeout: {0}", authorizationCacheTimeout);

    userCacheTimeout = config.getValue(BASE + "userCacheTimeout", Long.class);
    userCache = new ExpiringCache<>(userCacheTimeout * 1000);
    LOGGER.log(Level.INFO, "userCacheTimeout: {0}", userCacheTimeout);

    roleCacheTimeout = config.getValue(BASE + "roleCacheTimeout", Long.class);
    roleCache = new ExpiringCache<>(roleCacheTimeout * 1000);
    LOGGER.log(Level.INFO, "roleCacheTimeout: {0}", roleCacheTimeout);

    anonymousUser = new User();
    anonymousUser.setId(ANONYMOUS_USER);
    anonymousUser.setName(ANONYMOUS_USER);
    anonymousUser.getRoleIds().add(EVERYONE_ROLE);
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "Destroying SecurityService");
    daoStore.close();
  }

  public List<User> getUsers(String odataFilter, String odataOrderBy)
  {
    LOGGER.log(Level.FINE, "filter: {0}", odataFilter);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      SimpleODataParser parser = new SimpleODataParser(userFieldMap);
      Map<String, Object> filter = parser.parseFilter(odataFilter);
      List<String> orderBy = parser.parseOrderBy(odataOrderBy);

      Dao<User> userDao = conn.getUserDao();
      return userDao.select(filter, orderBy);
    }
  }

  public User getUser(String userId)
  {
    LOGGER.log(Level.FINE, "userId: {0}", userId);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<User> userDao = conn.getUserDao();
      return userDao.select(userId);
    }
  }

  public User createUser(User user)
  {
    LOGGER.log(Level.FINE, "userId: {0}", user.getId());

    validateUser(user);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<User> userDao = conn.getUserDao();
      User prevUser = userDao.select(user.getId());
      if (prevUser != null)
        throw new InvalidRequestException(USER_ALREADY_EXISTS);

      userCache.remove(user.getId()); // User may exist in cache

      String dateString = getISODate();
      user.setCreationDate(dateString);
      user.setModifyDate(dateString);
      if (user.getActive() == null)
      {
        user.setActive(true);
      }
      return userDao.insert(user);
    }
  }

  public User updateUser(User userUpdate)
  {
    String userId = userUpdate.getId();
    LOGGER.log(Level.FINE, "userId: {0}", userId);

    validateUser(userUpdate);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<User> userDao = conn.getUserDao();
      User user = userDao.select(userUpdate.getId());
      if (user == null) throw new NotFoundException(USER_NOT_FOUND);

      userCache.remove(userId);

      user.setName(userUpdate.getName());
      user.setEmail(userUpdate.getEmail());
      if (userUpdate.getActive() != null)
      {
        user.setActive(userUpdate.getActive());
      }
      user.setRoleIds(userUpdate.getRoleIds());
      user.setPasswordHash(userUpdate.getPasswordHash());
      String dateString = getISODate();
      user.setModifyDate(dateString);
      user = userDao.update(user);
      return user;
    }
  }

  public boolean deleteUser(String userId)
  {
    LOGGER.log(Level.FINE, "userId: {0}", userId);
    userCache.remove(userId);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<User> userDao = conn.getUserDao();
      return userDao.delete(userId);
    }
  }

  public List<Role> getRoles(String odataFilter, String odataOrderBy)
  {
    LOGGER.log(Level.FINE, "filter: {0}", odataFilter);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      SimpleODataParser parser = new SimpleODataParser(roleFieldMap);
      Map<String, Object> filter = parser.parseFilter(odataFilter);
      List<String> orderBy = parser.parseOrderBy(odataOrderBy);

      Dao<Role> userDao = conn.getRoleDao();
      return userDao.select(filter, orderBy);
    }
  }

  public Role getRole(String roleId)
  {
    LOGGER.log(Level.FINE, "roleId: {0}", roleId);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<Role> roleDao = conn.getRoleDao();
      return roleDao.select(roleId);
    }
  }

  public Role createRole(Role role)
  {
    LOGGER.log(Level.FINE, "roleId: {0}", role.getId());

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<Role> roleDao = conn.getRoleDao();
      return roleDao.insert(role);
    }
  }

  public Role updateRole(Role role)
  {
    LOGGER.log(Level.FINE, "roleId: {0}", role.getId());
    roleCache.remove(role.getId());

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<Role> roleDao = conn.getRoleDao();
      return roleDao.update(role);
    }
  }

  public boolean deleteRole(String roleId)
  {
    LOGGER.log(Level.FINE, "roleId: {0}", roleId);
    roleCache.remove(roleId);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<Role> roleDao = conn.getRoleDao();
      return roleDao.delete(roleId);
    }
  }

  public void changePassword(String userId,
    String oldPassword, String newPassword)
  {
    LOGGER.log(Level.FINE, "userId: {0}", userId);

    if (ADMIN_USER.equals(userId) ||
        ANONYMOUS_USER.equals(userId) ||
        StringUtils.isBlank(newPassword))
      throw new InvalidRequestException(CAN_NOT_CHANGE_PASSWORD);

    try (SecurityDaoConnection conn = daoStore.getConnection())
    {
      Dao<User> userDao = conn.getUserDao();
      User user = userDao.select(userId);

      if (user == null ||
          !Objects.equals(hash(oldPassword), user.getPasswordHash()))
        throw new InvalidRequestException(CAN_NOT_CHANGE_PASSWORD);

      checkPasswordFormat(newPassword);
      user.setPasswordHash(hash(newPassword));

      userDao.update(user);
    }
  }

  public User getCurrentUser()
  {
    User user;
    String authorization;
    HttpServletRequest request;

    if (requestInstance.isResolvable())
    {
      request = requestInstance.get();
      user = (User)request.getAttribute(USER_REQUEST_ATTRIBUTE);
      if (user != null) return user;

      authorization = request.getHeader("Authorization");
      if (authorization == null)
      {
        request.setAttribute(USER_REQUEST_ATTRIBUTE, anonymousUser);
        return anonymousUser;
      }
    }
    else // not in servlet context
    {
      return anonymousUser;
    }

    String userId = authorizationCache.get(authorization);

    if (userId != null)
    {
      user = userCache.get(userId);
      if (user != null) return user;
    }

    user = getUserFromAuthorization(authorization);
    userId =  user.getId().trim();

    if (ANONYMOUS_USER.equals(userId)) return anonymousUser;

    explodeRoles(user.getRoleIds()); // explodeRoles
    user.getRoleIds().add(userId); // add nominal role;
    user.getRoleIds().add(EVERYONE_ROLE);
    user.getRoleIds().add(AUTHENTICATED_ROLE);
    if (ADMIN_USER.equals(userId))
    {
      user.getRoleIds().add(ADMIN_ROLE);
    }
    authorizationCache.put(authorization, userId);
    userCache.put(userId, user);
    request.setAttribute(USER_REQUEST_ATTRIBUTE, user);

    LOGGER.log(Level.FINE, "User {0} identified with roles {1}",
      new Object[] { userId, user.getRoleIds() });

    return user;
  }

  /* private methods */

  private User getUserFromAuthorization(String authorization)
  {
    String[] authoParts = authorization.split(" ");
    if (authoParts.length == 2)
    {
      String authoType = authoParts[0];
      if ("basic".equalsIgnoreCase(authoType))
      {
        String userPassword = authoParts[1].trim();
        String decoded = new String(Base64.getDecoder().decode(userPassword));
        String[] userPasswordParts = decoded.split(":");
        String userId = userPasswordParts[0];
        String password = userPasswordParts[1];

        if (ANONYMOUS_USER.equals(userId)) return anonymousUser;

        User user = getUser(userId); // get from store
        if (user == null)
        {
          user = new User();
          user.setId(userId);
          user.setName(userId);
        }

        if (FALSE.equals(user.getActive()))
          throw new NotAuthorizedException(USER_IS_NOT_ACTIVE);

        if (userId.equals(ADMIN_USER)) // admin user
        {
          if (!adminPassword.equals(password))
            throw new NotAuthorizedException();
        }
        else if (user.getPasswordHash() == null) // LDAP User
        {
          if (ldapConnector == null ||
              !ldapConnector.validateCredentials(userId, password))
            throw new NotAuthorizedException();
        }
        else // check hashed password in User
        {
          String passwordHash = hash(password);

          if (!user.getPasswordHash().equals(passwordHash))
            throw new NotAuthorizedException();
        }
        return user;
      }
      else if ("bearer".equalsIgnoreCase(authoType))
      {
        String token = authoParts[1].trim();
        //TODO: find User by token
      }
    }
    return anonymousUser;
  }

  private void validateUser(User user)
  {
    if (StringUtils.isBlank(user.getId()))
      throw new InvalidRequestException(ID_IS_REQUIRED);

    String password = user.getPassword();
    if (!StringUtils.isBlank(password))
    {
      checkPasswordFormat(password);
      user.setPasswordHash(hash(password));
      user.setPassword(null);
    }
  }

  private void checkPasswordFormat(String password)
  {
    String passwordPattern =
      config.getValue(BASE + "passwordPattern", String.class);

    if (!password.matches(passwordPattern))
      throw new InvalidRequestException(INVALID_PASSWORD_FORMAT);
  }

  private String hash(String password)
  {
    if (StringUtils.isBlank(password)) return null;

    try
    {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] bytes = digest.digest(password.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(bytes);
    }
    catch (NoSuchAlgorithmException ex)
    {
      throw new RuntimeException(ex);
    }
  }

  private void explodeRoles(Set<String> roleIds)
  {
    Stack<String> stack = new Stack<>();
    stack.addAll(roleIds);
    while (!stack.isEmpty())
    {
      String roleId = stack.pop();
      Role role = roleCache.get(roleId);
      if (role == null)
      {
        role = getRole(roleId);
        if (role == null)
        {
          // put non peristent Role in cache
          role = new Role();
          role.setId(roleId);
        }
        roleCache.put(roleId, role);
      }

      for (String subRoleId : role.getRoleIds())
      {
        if (!roleIds.contains(subRoleId))
        {
          stack.add(subRoleId);
          roleIds.add(subRoleId);
        }
      }
    }
  }
}
