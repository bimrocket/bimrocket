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
import jakarta.enterprise.context.ApplicationScoped;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Set;
import javax.naming.AuthenticationException;
import javax.naming.Context;
import javax.naming.NamingEnumeration;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;
import javax.naming.ldap.InitialLdapContext;
import javax.naming.ldap.LdapContext;
import org.eclipse.microprofile.config.Config;
import org.eclipse.microprofile.config.ConfigProvider;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class LdapConnector
{
  static final String BASE = "services.security.ldap.";

  private String ldapUrl;
  private String domain;
  private String searchBase;
  private String adminUsername;
  private String adminPassword;

  @PostConstruct
  public void init()
  {
    Config config = ConfigProvider.getConfig();
    ldapUrl = config.getValue(BASE + "url", String.class);
    domain = config.getValue(BASE + "domain", String.class);
    searchBase = config.getValue(BASE + "searchBase", String.class);
    adminUsername = config.getValue(BASE + "adminUsername", String.class);
    adminPassword = config.getValue(BASE + "adminPassword", String.class);
  }

  public String getLdapUrl()
  {
    return ldapUrl;
  }

  public void setLdapUrl(String ldapUrl)
  {
    this.ldapUrl = ldapUrl;
  }

  public String getDomain()
  {
    return domain;
  }

  public void setDomain(String domain)
  {
    this.domain = domain;
  }

  public String getSearchBase()
  {
    return searchBase;
  }

  public void setSearchBase(String searchBase)
  {
    this.searchBase = searchBase;
  }

  public String getAdminUsername()
  {
    return adminUsername;
  }

  public void setAdminUsername(String adminUsername)
  {
    this.adminUsername = adminUsername;
  }

  public String getAdminPassword()
  {
    return adminPassword;
  }

  public void setAdminPassword(String adminPassword)
  {
    this.adminPassword = adminPassword;
  }

  public boolean validateCredentials(String username, String password)
  {
    try
    {
      LdapContext context = createLdapContext(username, password);
      try
      {
        String searchFilter =
          "(&(objectClass=user)(sAMAccountName=" + username + "))";

        // Create the search controls
        SearchControls searchCtls = new SearchControls();

        // Specify the search scope
        searchCtls.setSearchScope(SearchControls.SUBTREE_SCOPE);

        // Search objects in GC using filters
        NamingEnumeration<?> answer =
          context.search(searchBase, searchFilter, searchCtls);

        boolean userFound = answer.hasMoreElements();

        answer.close();

        return userFound;
      }
      finally
      {
        context.close();
      }
    }
    catch (AuthenticationException ae)
    {
      return false;
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
  }

  private Set<String> getUserGroups(String username)
  {
    Set<String> roles = new HashSet<>();
    try
    {
      LdapContext context = createLdapContext(adminUsername, adminPassword);
      try
      {
        String searchFilter =
          "(&(objectClass=user)(sAMAccountName=" + username + "))";

        // Create the search controls
        SearchControls searchCtls = new SearchControls();

        // Specify the search scope
        searchCtls.setSearchScope(SearchControls.SUBTREE_SCOPE);

        // Search objects in GC using filters
        NamingEnumeration<? extends SearchResult> answer =
          context.search(searchBase, searchFilter, searchCtls);

        while (answer.hasMoreElements())
        {
          SearchResult res = answer.nextElement();
          Attributes attributes = res.getAttributes();
          NamingEnumeration<String> ids = attributes.getIDs();
          while (ids.hasMoreElements())
          {
            String id = ids.nextElement();
            if (id.equals("memberOf"))
            {
              Attribute attribute = attributes.get(id);
              NamingEnumeration<?> values = attribute.getAll();
              while (values.hasMoreElements())
              {
                String group = String.valueOf(values.nextElement());
                int index1 = group.indexOf("=");
                int index2 = group.indexOf(",");
                if (index1 != -1 && index2 != -1)
                {
                  roles.add(group.substring(index1 + 1, index2));
                }
              }
            }
          }
        }
        answer.close();
      }
      finally
      {
        context.close();
      }
    }
    catch (Exception ex)
    {
      throw new RuntimeException(ex);
    }
    return roles;
  }

  private LdapContext createLdapContext(String username, String password)
    throws Exception
  {
    Hashtable<String, String> env = new Hashtable<>();
    env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
    env.put(Context.SECURITY_AUTHENTICATION, "simple");
    env.put(Context.SECURITY_PRINCIPAL, username + "@" + domain);
    env.put(Context.SECURITY_CREDENTIALS, password);
    env.put("com.sun.jndi.ldap.connect.timeout", "3000"); // 3 seconds

    String[] urls = ldapUrl.split(";");
    LdapContext context = null;
    Exception exception = null;
    for (String url : urls)
    {
      env.put(Context.PROVIDER_URL, url);
      try
      {
        context = new InitialLdapContext(env, null);
      }
      catch (Exception ex)
      {
        exception = ex;
      }
    }
    if (context == null) throw exception;

    return context;
  }
}
