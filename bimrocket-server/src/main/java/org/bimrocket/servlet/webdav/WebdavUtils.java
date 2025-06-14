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
package org.bimrocket.servlet.webdav;

import org.apache.commons.collections4.BidiMap;
import org.apache.commons.collections4.bidimap.DualHashBidiMap;
import org.bimrocket.service.file.Privilege;
import static org.bimrocket.service.file.Privilege.READ;
import static org.bimrocket.service.file.Privilege.READ_ACL;
import static org.bimrocket.service.file.Privilege.WRITE;
import static org.bimrocket.service.file.Privilege.WRITE_ACL;

/**
 *
 * @author realor
 */
public class WebdavUtils
{
  public static final String DAV_NS = "DAV:";
  
  static final BidiMap<String, Privilege> xmlTagToPrivilege = new DualHashBidiMap<>();
  
  static
  {
    xmlTagToPrivilege.put("read", READ);
    xmlTagToPrivilege.put("write", WRITE);
    xmlTagToPrivilege.put("read-acl", READ_ACL);
    xmlTagToPrivilege.put("write-acl", WRITE_ACL);
  }

  public static Privilege mapXmlTagToPrivilege(String privilegeTag)
  {
    Privilege privilege = xmlTagToPrivilege.get(privilegeTag);
    if (privilege == null)
      throw new IllegalArgumentException("Unsupported privilege " + privilegeTag);
    return privilege;
  }  
  
  public static String mapPrivilegeToXmlTag(Privilege privilege)
  {
    String privilegeTag = xmlTagToPrivilege.inverseBidiMap().get(privilege);
    if (privilegeTag == null)
      throw new IllegalArgumentException("Unsupported privilege " + privilege);
    return privilegeTag;
  }
}
