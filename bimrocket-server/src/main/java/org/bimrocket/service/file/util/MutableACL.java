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
import java.util.HashSet;
import java.util.Set;
import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.Privilege;

/**
 *
 * @author realor
 */
public class MutableACL implements ACL
{
  // privilege -> Set<roleId>
  private final HashMap<Privilege, Set<String>> map = new HashMap<>();

  @Override
  public Set<String> getRoleIds()
  {
    HashSet<String> roleIds = new HashSet<>();
    for (Privilege priviledge : map.keySet())
    {
      roleIds.addAll(map.get(priviledge));
    }
    return roleIds;
  }

  @Override
  public Set<Privilege> getPrivileges()
  {
    return Collections.unmodifiableSet(map.keySet());
  }

  @Override
  public Set<Privilege> getPrivilegesForRoleId(String roleId)
  {
    HashSet<Privilege> priviledges = new HashSet<>();
    for (Privilege priviledge : map.keySet())
    {
      if (map.get(priviledge).contains(roleId))
      {
        priviledges.add(priviledge);
      }
    }
    return priviledges;
  }

  @Override
  public Set<String> getRoleIdsForPrivilege(Privilege privilege)
  {
    return getRoleIdsForPrivilege(privilege, false);
  }

  public void grant(String roleId, Privilege privilege)
  {
    Set<String> roleIds = getRoleIdsForPrivilege(privilege, true);
    roleIds.add(roleId);
  }

  public void grant(String roleId, Collection<Privilege> privileges)
  {
    for (Privilege privilege : privileges)
    {
      Set<String> roleIds = getRoleIdsForPrivilege(privilege, true);
      roleIds.add(roleId);
    }
  }

  public void grant(Collection<String> roleIds, Privilege privilege)
  {
    Set<String> currentRoleIds = getRoleIdsForPrivilege(privilege, true);
    currentRoleIds.addAll(roleIds);
  }

  public void revoke(String roleId)
  {
    map.keySet().forEach(privilege -> map.get(privilege).remove(roleId));
  }

  public void revoke(String roleId, Privilege privilege)
  {
    Set<String> roleIds = map.get(privilege);
    if (roleIds != null)
    {
      roleIds.remove(roleId);
    }
  }

  public void revoke(String roleId, Collection<Privilege> privileges)
  {
    for (Privilege privilege : privileges)
    {
      revoke(roleId, privilege);
    }
  }

  public void copy(ACL acl)
  {
    if (!equals(acl))
    {
      map.clear();
      acl.getPrivileges().forEach(priviledge ->
        map.put(priviledge, acl.getRoleIdsForPrivilege(priviledge)));
    }
  }

  @Override
  public String toString()
  {
    return map.toString();
  }

  protected Set<String> getRoleIdsForPrivilege(Privilege privilege,
    boolean forEdit)
  {
    Set<String> roleIds = map.get(privilege);
    if (roleIds == null && forEdit)
    {
      roleIds = new HashSet<>();
      map.put(privilege, roleIds);
      return roleIds;
    }
    return roleIds == null ? Collections.emptySet() : roleIds;
  }
}
