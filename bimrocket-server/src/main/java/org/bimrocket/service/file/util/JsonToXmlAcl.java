package org.bimrocket.service.file.util;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;
import java.io.StringWriter;
import java.util.*;

public class JsonToXmlAcl {
    public static String convertJsonToAclXml(String jsonInput) throws XMLStreamException {
        // Parse JSON
        Gson gson = new Gson();
        Map<String, List<String>> aclMap = gson.fromJson(jsonInput, new TypeToken<Map<String, List<String>>>() {
        }.getType());

        // Initialize XML output
        StringWriter stringWriter = new StringWriter();
        XMLOutputFactory factory = XMLOutputFactory.newInstance();
        XMLStreamWriter writer = factory.createXMLStreamWriter(stringWriter);

        // Start XML document
        writer.writeStartDocument("utf-8", "1.0");
        writer.setPrefix("D", "DAV");
        writer.writeStartElement("D", "acl", "DAV");
        writer.writeNamespace("D", "DAV");

        // Map privileges to their WebDAV names
        Map<String, String> privilegeMapping = new HashMap<>();
        privilegeMapping.put("READ", "read");
        privilegeMapping.put("WRITE", "write");
        privilegeMapping.put("READ_ACL", "read-acl");
        privilegeMapping.put("WRITE_ACL", "write-acl");

        // Collect all principals and their privileges
        Map<String, Set<String>> principalToPrivileges = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : aclMap.entrySet()) {
            String privilege = privilegeMapping.get(entry.getKey().toUpperCase());
            if (privilege == null) continue; // Skip unknown privileges
            for (String principal : entry.getValue()) {
                principalToPrivileges.computeIfAbsent(principal, k -> new HashSet<>()).add(privilege);
            }
        }

        // Write ACEs for each principal
        for (Map.Entry<String, Set<String>> entry : principalToPrivileges.entrySet()) {
            String principal = entry.getKey();
            Set<String> privileges = entry.getValue();

            // Start ACE
            writer.writeStartElement("D", "ace", "D");

            // Write principal
            writer.writeStartElement("D", "principal", "D");
            if (principal.equalsIgnoreCase("EVERYONE")) {
                writer.writeEmptyElement("D", "all", "D");
            } else if (principal.equalsIgnoreCase("AUTHENTICATED")) {
                writer.writeEmptyElement("D", "authenticated", "D");

            }

            else {
                writer.writeStartElement("D", "href", "D");
                writer.writeCharacters(principal);
                writer.writeEndElement(); // href
            }
            writer.writeEndElement(); // principal

            // Write grant
            writer.writeStartElement("D", "grant", "D");
            for (String privilege : privileges) {
                writer.writeStartElement("D", "privilege", "D");
                writer.writeEmptyElement("D", privilege, "D");
                writer.writeEndElement(); // privilege
            }
            writer.writeEndElement(); // grant

            writer.writeEndElement(); // ace
        }

        // End XML document
        writer.writeEndElement(); // acl
        writer.writeEndDocument();
        writer.close();

        return stringWriter.toString();
    }
}