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

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Map;
import java.util.Set;
import javax.naming.AuthenticationException;
import javax.naming.Context;
import javax.naming.NamingEnumeration;
import javax.naming.directory.SearchControls;
import javax.naming.ldap.InitialLdapContext;
import javax.naming.ldap.LdapContext;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author realor
 */
public class LdapUserStore implements UserStore
{
  private final Map<String, String> credentialsCache = 
    Collections.synchronizedMap(new HashMap<>());
  private final Set<String> userRoles = new HashSet<>();

  private String ldapUrl;
  private String domain;
  private String searchBase;
  
  public LdapUserStore()
  {
    userRoles.add("BASIC");
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

  @Override
  public boolean validateCredential(String username, String password)
  {
    if (StringUtils.isBlank(username)) return true;
    
    String cachedPassword = credentialsCache.get(username);
    if (StringUtils.equals(password, cachedPassword)) return true;
    
    if (validateLdap(username, password))
    {
      credentialsCache.put(username, password);
      return true;
    }
    return false;
  }

  @Override
  public Set<String> getRoles(String username)
  {
    return username != null ? userRoles : Collections.emptySet();
  }

  private boolean validateLdap(String username, String password)
  {
    try
    {
      LdapContext ctxGC = createLdapContext(username, password);

      String searchFilter =
        "(&(objectClass=user)(sAMAccountName=" + username + "))";

      // Create the search controls
      SearchControls searchCtls = new SearchControls();

      // Specify the search scope
      searchCtls.setSearchScope(SearchControls.SUBTREE_SCOPE);

      // Search objects in GC using filters
      NamingEnumeration<?> answer =
        ctxGC.search(searchBase, searchFilter, searchCtls);

      return answer.hasMoreElements();
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
