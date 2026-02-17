package org.bimrocket.servlet.webdav;

import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.Privilege;
import org.bimrocket.service.file.util.MutableACL;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;

public class ACLXMLDeserializerTest
{
  @Test
  public void testDeserializePrivilegesAdmin()
  {
    Object[] arrayResult = null;

    // Rol ADMIN privileges must be READ-ACL and WRITE-ACL
    try
    {
      ACL acl = ACLXMLDeserializer.deserialize(returnXMLSource(), "user");
      arrayResult = acl.getPrivilegesForRoleId("ADMIN").toArray();
    }
    catch (IOException e)
    {
      throw new RuntimeException(e);
    }

    assertTrue(arrayResult.length == 2 &&
      findStringInArray(arrayResult, Privilege.READ_ACL.toString()) &&
      findStringInArray(arrayResult, Privilege.WRITE_ACL.toString())
      );
  }

  @Test
  public void testDeserializePrivilegesProjectista()
  {
    Object[] listRolesIdPrivileges = null;

    // PROJECTISTA is the only one with WRITE privileges
    try {
      ACL acl = ACLXMLDeserializer.deserialize(returnXMLSource(), "user");
      listRolesIdPrivileges = acl.getRoleIdsForPrivilege(Privilege.WRITE).toArray();
    }
    catch (IOException e)
    {
      throw new RuntimeException(e);
    }

    assertTrue(findStringInArray(listRolesIdPrivileges, "PROJECTISTA"));
  }

  @Test
  public void testDeserializePrivilegesVector()
  {
    Object[] listRolesIdPrivileges = null;

    // VECTOR-UT-OGE have not WRITE privileges
    try {
      ACL acl = ACLXMLDeserializer.deserialize(returnXMLSource(), "user");
      listRolesIdPrivileges = acl.getRoleIdsForPrivilege(Privilege.WRITE).toArray();
    }
    catch (IOException e)
    {
      throw new RuntimeException(e);
    }

    assertFalse(findStringInArray(listRolesIdPrivileges, "VECTOR-UT-OGE"));
  }

  @Test
  public void testDeserializeUnknownRole()
  {
    Object[] listRolesId = null;

    // UNKNOWN Role do not no exist
    try {
      ACL acl = ACLXMLDeserializer.deserialize(returnXMLSource(), "user");
      listRolesId = acl.getRoleIds().toArray();
    }
    catch (IOException e)
    {
      throw new RuntimeException(e);
    }

    assertFalse(findStringInArray(listRolesId, "UNKNOWN"));
  }

  boolean findStringInArray(Object[] listValues, String value)
  {
    boolean foundValue = false;
    for (Object o : listValues)
    {
      if (value.equals(o.toString()))
      {
        foundValue = true;
        break;
      }
    }
    return foundValue;
  }

  String returnXMLSource() {
    return """
    <?xml version="1.0" encoding="utf-8"?>
    <D:acl xmlns:D="DAV:">
                
    <!-- Access for PROJECTISTA -->
    <D:ace>
        <D:principal>
            <D:href>PROJECTISTA</D:href>
        </D:principal>
        <D:grant>
            <D:privilege><D:read/></D:privilege>
            <D:privilege><D:write/></D:privilege>
        </D:grant>
    </D:ace>
    
    <!-- Access for VECTOR-UT-OGE -->
    <D:ace>
        <D:principal>
            <D:href>VECTOR-UT-OGE</D:href>
        </D:principal>
        <D:grant>
            <D:privilege><D:read/></D:privilege>
        </D:grant>
    </D:ace>
                
    <!-- Access for ADMIN -->
    <D:ace>
        <D:principal>
            <D:href>ADMIN</D:href>
        </D:principal>
        <D:grant>
            <D:privilege><D:read-acl/></D:privilege>
            <D:privilege><D:write-acl/></D:privilege>
        </D:grant>
    </D:ace>
    
    </D:acl>
    """;
  }

}
