package org.bimrocket.service.file.util;

import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.service.file.Privilege;
import org.bimrocket.service.security.SecurityConstants;
import org.w3c.dom.*;
import javax.xml.parsers.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

// i2CAT: Deserialize XML to MutableACL object
public class MutableACLXMLDeserializer {

    // Map of privileges
    private static final Map<String, Privilege> PRIVILEGE_MAP = Map.of(
            "READ", Privilege.READ,
            "WRITE", Privilege.WRITE,
            "READ_ACL", Privilege.READ_ACL,
            "WRITE_ACL", Privilege.WRITE_ACL
    );
    private static final String BAD_ROLE = "Unknown Role ";

    // i2CAT: Receives current user to replace when tag is D:owner
    public static MutableACL deserialize(String xml, String userId) throws Exception {
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

        for (int i = 0; i < aceList.getLength(); i++) {
            Element ace = (Element) aceList.item(i);
            String principal = getPrincipal(ace, userId);
            NodeList privileges = ace.getElementsByTagName("D:privilege");

            for (int j = 0; j < privileges.getLength(); j++) {
                Element privilege = (Element) privileges.item(j);
                String privilegeType = privilege.getFirstChild().getNodeName();

                switch (privilegeType) {
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
        aclMap.forEach((key, value) -> {
            Privilege priv = PRIVILEGE_MAP.getOrDefault(key, null);
            acl.grant(value, priv);
        });

        return acl;
    }

    // Check role type
    private static String getPrincipal(Element ace, String userId) throws Exception {
        NodeList principalNodes = ace.getElementsByTagName("D:principal");
        if (principalNodes.getLength() > 0) {
            Element principalElement = (Element) principalNodes.item(0);

            if (principalElement.getElementsByTagName("D:all").getLength() > 0) {
                return SecurityConstants.EVERYONE_ROLE;
            } else if (principalElement.getElementsByTagName("D:authenticated").getLength() > 0) {
                return SecurityConstants.AUTHENTICATED_ROLE;
            } else if (principalElement.getElementsByTagName("D:href").getLength() > 0) {
                return principalElement.getElementsByTagName("D:href").item(0).getTextContent();
            }
        }
        return "UNKNOWN";
    }
}