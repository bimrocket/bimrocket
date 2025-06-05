package org.bimrocket.servlet.webdav;

import org.bimrocket.service.file.ACL;
import org.bimrocket.service.file.Privilege;
import org.w3c.dom.*;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

public class ACLXMLDeserializer
{

  public static String deserialize(ACL acl) throws Exception
  {
    DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
    DocumentBuilder db = dbf.newDocumentBuilder();
    Document doc = db.newDocument();

    Element root = doc.createElementNS("DAV:", "D:acl");
    doc.appendChild(root);

    // Map rol → privileges
    Map<String, Set<Privilege>> roleToPrivileges = new HashMap<>();

    for (Privilege priv : acl.getPrivileges())
    {
      Set<String> roleIds = acl.getRoleIdsForPrivilege(priv);
      if (roleIds == null) continue;
      for (String role : roleIds)
      {
        roleToPrivileges.computeIfAbsent(role, k -> new LinkedHashSet<>()).add(priv);
      }
    }

    // Generate ACE by role
    for (Map.Entry<String, Set<Privilege>> entry : roleToPrivileges.entrySet())
    {
      String roleId = entry.getKey();
      Set<Privilege> privileges = entry.getValue();
      if (privileges == null || privileges.isEmpty()) continue;

      Element ace = doc.createElementNS("DAV:", "D:ace");
      Element principal = doc.createElementNS("DAV:", "D:principal");

      switch (roleId.toUpperCase()) {
        case "EVERYONE":
          principal.appendChild(doc.createElementNS("DAV:", "D:all"));
          break;
        case "AUTHENTICATED":
          principal.appendChild(doc.createElementNS("DAV:", "D:authenticated"));
          break;
        default:
          Element href = doc.createElementNS("DAV:", "D:href");
          href.setTextContent(roleId);
          principal.appendChild(href);
          break;
      }

      ace.appendChild(principal);

      Element grant = doc.createElementNS("DAV:", "D:grant");
      for (Privilege priv : privileges)
      {
        Element privilege = doc.createElementNS("DAV:", "D:privilege");
        Element privElement = doc.createElementNS("DAV:", "D:" + mapPrivilegeToXmlTag(priv));
        privilege.appendChild(privElement);
        grant.appendChild(privilege);
      }

      ace.appendChild(grant);
      root.appendChild(ace);
    }

    // Output XML
    Transformer transformer = TransformerFactory.newInstance().newTransformer();
    transformer.setOutputProperty(OutputKeys.INDENT, "yes");
    transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
    transformer.setOutputProperty(OutputKeys.METHOD, "xml");
    transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");

    StringWriter writer = new StringWriter();
    transformer.transform(new DOMSource(doc), new StreamResult(writer));
    return writer.toString();
  }

  private static String mapPrivilegeToXmlTag(Privilege priv)
  {
    return priv.name().toLowerCase().replace('_', '-');
  }
}
