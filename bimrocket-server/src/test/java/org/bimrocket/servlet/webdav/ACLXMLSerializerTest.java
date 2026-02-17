package org.bimrocket.servlet.webdav;

import org.bimrocket.service.file.Privilege;
import org.bimrocket.service.file.util.MutableACL;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

public class ACLXMLSerializerTest
{
  @Test
  public void testSerialize_privileges_admin()
  {
    // ADMIN must have READ_ACL and WRITE_ACL privileges
    MutableACL acl = new MutableACL();
    acl.grant("ADMIN", Privilege.READ_ACL);
    acl.grant("ADMIN", Privilege.WRITE_ACL);

    acl.grant("PROJECTISTA", Privilege.READ);
    String result = ACLXMLSerializer.serialize(acl);

    assertTrue((result.contains("read-acl") && result.contains("ADMIN")) ||
      (result.contains("write-acl") && result.contains("ADMIN"))
    );
  }

  @Test
  public void testSerialize_error_privileges_admin()
  {
    // ADMIN must have READ_ACL and WRITE_ACL privileges but not WRITE
    MutableACL acl = new MutableACL();
    acl.grant("ADMIN", Privilege.READ_ACL);
    acl.grant("ADMIN", Privilege.WRITE_ACL);

    acl.grant("PROJECTISTA", Privilege.READ);
    String result = ACLXMLSerializer.serialize(acl);

    assertTrue(result.contains("read-acl") && result.contains("ADMIN"));
    assertTrue(result.contains("write-acl") && result.contains("ADMIN"));
    assertFalse(result.matches("(?s).*\\bwrite\\b.*ADMIN.*"));
  }

  @Test
  public void testSerialize_error_privileges_projectista()
  {
    // PROJECTISTA must have READ and WRITE privileges
    MutableACL acl = new MutableACL();
    acl.grant("ADMIN", Privilege.READ_ACL);
    acl.grant("ADMIN", Privilege.WRITE_ACL);

    acl.grant("PROJECTISTA", Privilege.READ);
    String result = ACLXMLSerializer.serialize(acl);

    assertTrue(result.contains("read") && result.contains("PROJECTISTA"));
    assertFalse(result.matches("(?s).*\\bwrite\\b.*PROJECTISTA.*"));
  }

  @Test
  public void testSerialize_unknown_role()
  {
    // Role must be ADMIN, PROJECTISTA or VECTOR-UT-OGE
    MutableACL acl = new MutableACL();
    acl.grant("UNKNOWN", Privilege.READ_ACL);
    acl.grant("UNKNOWN", Privilege.WRITE_ACL);

    acl.grant("PROJECTISTA", Privilege.READ);
    String result = ACLXMLSerializer.serialize(acl);

    assertFalse(result.contains("read-acl") && result.contains("ADMIN"));
    assertFalse(result.contains("write-acl") && result.contains("ADMIN"));
    assertTrue(result.contains("read") && result.contains("PROJECTISTA"));
  }

  @Test
  public void testSerialize_role_vector_not_found()
  {
    // Role must be ADMIN, PROJECTISTA or VECTOR-UT-OGE
    MutableACL acl = new MutableACL();
    acl.grant("UNKNOWN", Privilege.READ_ACL);
    acl.grant("UNKNOWN", Privilege.WRITE_ACL);

    acl.grant("PROJECTISTA", Privilege.READ);
    String result = ACLXMLSerializer.serialize(acl);

    assertFalse(result.contains("read-acl") && result.contains("ADMIN"));
    assertFalse(result.contains("write-acl") && result.contains("ADMIN"));
    assertTrue(result.contains("read") && result.contains("PROJECTISTA"));
    assertFalse(result.contains("VECTOR-UT-OGE"));
  }
}
