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
import java.util.Set;
import javax.xml.parsers.ParserConfigurationException;
import static org.bimrocket.service.security.SecurityConstants.AUTHENTICATED_ROLE;
import static org.bimrocket.service.security.SecurityConstants.EVERYONE_ROLE;
import static org.bimrocket.servlet.webdav.WebdavUtils.*;

public class ACLXMLSerializer
{
  public static String serialize(ACL acl)
  {
    try
    {
      DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
      DocumentBuilder db = dbf.newDocumentBuilder();
      Document doc = db.newDocument();

      Element root = doc.createElementNS(DAV_NS, "D:acl");
      doc.appendChild(root);

      // Generate ACE by role
      for (String roleId : acl.getRoleIds())
      {
        Set<Privilege> privileges = acl.getPrivilegesForRoleId(roleId);
        if (privileges.isEmpty()) continue;

        Element ace = doc.createElementNS(DAV_NS, "D:ace");
        Element principal = doc.createElementNS(DAV_NS, "D:principal");

        switch (roleId.toUpperCase()) 
        {
          case EVERYONE_ROLE:
            principal.appendChild(doc.createElementNS(DAV_NS, "D:all"));
            break;
          case AUTHENTICATED_ROLE:
            principal.appendChild(doc.createElementNS(DAV_NS, "D:authenticated"));
            break;
          default:
            Element href = doc.createElementNS(DAV_NS, "D:href");
            href.setTextContent(roleId);
            principal.appendChild(href);
            break;
        }

        ace.appendChild(principal);

        Element grant = doc.createElementNS(DAV_NS, "D:grant");
        for (Privilege privilege : privileges)
        {
          Element privilegeElement = doc.createElementNS(DAV_NS, "D:privilege");
          Element privElement = doc.createElementNS(DAV_NS, 
            "D:" + mapPrivilegeToXmlTag(privilege));
          privilegeElement.appendChild(privElement);
          grant.appendChild(privilegeElement);
        }

        ace.appendChild(grant);
        root.appendChild(ace);
      }

      // Indent output XML
      Transformer transformer = TransformerFactory.newInstance().newTransformer();
      transformer.setOutputProperty(OutputKeys.INDENT, "yes");
      transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
      transformer.setOutputProperty(OutputKeys.METHOD, "xml");
      transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");

      StringWriter writer = new StringWriter();
      transformer.transform(new DOMSource(doc), new StreamResult(writer));
      return writer.toString();
    }
    catch (IllegalArgumentException | ParserConfigurationException | 
          TransformerException | DOMException ex)
    {
      throw new RuntimeException(ex);
    }
  }
}
