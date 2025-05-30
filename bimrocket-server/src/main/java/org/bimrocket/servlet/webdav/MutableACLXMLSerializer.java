package org.bimrocket.servlet.webdav;

import org.bimrocket.service.file.Privilege;
import org.bimrocket.service.file.util.MutableACL;
import org.bimrocket.service.security.SecurityConstants;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// i2CAT: Deserialize XML to MutableACL object
public class MutableACLXMLSerializer
{

  // Map of privileges
  private static final Map<String, Privilege> PRIVILEGE_MAP = Map.of(
        "READ", Privilege.READ,
        "WRITE", Privilege.WRITE,
        "READ_ACL", Privilege.READ_ACL,
        "WRITE_ACL", Privilege.WRITE_ACL
  );
  private static final String BAD_ROLE = "Unknown Role ";

  // i2CAT: Receives current user to replace when tag is D:owner
  public static MutableACL serialize(String xml, String userId) throws Exception
  {
    MutableACL acl = new MutableACL();

    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    DocumentBuilder builder = factory.newDocumentBuilder();
    Document doc = builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));

    // Map to group permissions
    Map<String, List<String>> aclMap = new HashMap<>();
    aclMap.put("READ_ACL", new ArrayList<>());
    aclMap.put("WRITE_ACL", new ArrayList<>());
    aclMap.put("READ", new ArrayList<>());
    aclMap.put("WRITE", new ArrayList<>());

    NodeList aceList = doc.getElementsByTagName("D:ace");

    for (int i = 0; i < aceList.getLength(); i++)
    {
      Element ace = (Element) aceList.item(i);
      String principal = getPrincipal(ace, userId);
      NodeList privileges = ace.getElementsByTagName("D:privilege");

      for (int j = 0; j < privileges.getLength(); j++)
      {
        Element privilege = (Element) privileges.item(j);

        Element privilegeElement = getFirstElementChild(privilege);
        if (privilegeElement == null) continue;
        String privilegeType = privilegeElement.getNodeName();

        switch (privilegeType)
        {
          case "D:read-acl":
            aclMap.get("READ_ACL").add(principal);
            break;
          case "D:write-acl":
            aclMap.get("WRITE_ACL").add(principal);
            break;
          case "D:read":
            aclMap.get("READ").add(principal);
            break;
          case "D:write":
            aclMap.get("WRITE").add(principal);
            break;
        }
      }
    }

    // Retrieve results over acl object
    aclMap.forEach((key, value) ->
    {
      Privilege priv = PRIVILEGE_MAP.getOrDefault(key, null);
      acl.grant(value, priv);
    });

    return acl;
  }

  //Get First Element for Privileges
  private static Element getFirstElementChild(Node node)
  {
    NodeList children = node.getChildNodes();
    for (int i = 0; i < children.getLength(); i++)
    {
      Node child = children.item(i);
      if (child.getNodeType() == Node.ELEMENT_NODE)
      {
        return (Element) child;
      }
    }
    return null;
  }

  // Check role type
  private static String getPrincipal(Element ace, String userId) throws Exception
  {
    NodeList principalNodes = ace.getElementsByTagName("D:principal");
    if (principalNodes.getLength() > 0)
    {
      Element principalElement = (Element) principalNodes.item(0);

      if (principalElement.getElementsByTagName("D:all").getLength() > 0)
      {
        return SecurityConstants.EVERYONE_ROLE;
      } else if (principalElement.getElementsByTagName("D:authenticated").getLength() > 0)
      {
        return SecurityConstants.AUTHENTICATED_ROLE;
      } else if (principalElement.getElementsByTagName("D:href").getLength() > 0)
      {
        return principalElement.getElementsByTagName("D:href").item(0).getTextContent();
      }
    }
    return "UNKNOWN";
  }
}