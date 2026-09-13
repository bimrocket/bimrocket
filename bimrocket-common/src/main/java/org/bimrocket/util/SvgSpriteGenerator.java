/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2026, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.util;

import java.nio.file.*;
import java.util.Comparator;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.*;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.w3c.dom.*;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 *
 * @author realor
 */

public class SvgSpriteGenerator
{
  static final Set<String> SKIP_TAGS;
  static final Set<String> SKIP_ATTRIBUTES;

  static final String SVG_NS = "http://www.w3.org/2000/svg";
  static final String NORMALIZE_FLAG = "normalize";
  static final String STACK_FLAG = "stack";
  static final String FILL_FLAG = "fill";

  static final String[] STYLE_ATTRIBUTES = new String[]
  {
    "viewBox",
    "stroke",
    "fill",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin"
  };

  static
  {
    SKIP_TAGS = new HashSet<>();
    SKIP_TAGS.add("defs");
    SKIP_TAGS.add("metadata");
    SKIP_TAGS.add("sodipodi:namedview");

    SKIP_ATTRIBUTES = new HashSet<>();
    SKIP_ATTRIBUTES.add("sodipodi");
    SKIP_ATTRIBUTES.add("inkscape");
  }

  public static void main(String[] args) throws Exception
  {
    Set<String> flags = new HashSet<>();
    List<String> files = new ArrayList<>();
    for (String arg : args)
    {
      if (arg.startsWith("-"))
      {
        flags.add(arg.substring(1));
      }
      else
      {
        files.add(arg);
      }
    }

    if (files.isEmpty() || files.size() % 2 == 1)
    {
      System.out.println(
        "arguments: [-%s] [-%s] [-%s] [<inputDir> <outputFile>]*"
         .formatted(NORMALIZE_FLAG, STACK_FLAG, FILL_FLAG));

      System.out.println("  -%s: change stroke and fill colors to currentColor."
        .formatted(NORMALIZE_FLAG));
      System.out.println("  -%s: use svg tag for icons (instead of symbol)."
        .formatted(STACK_FLAG));
      System.out.println("  -%s: when normalize, fill icons by default."
        .formatted(FILL_FLAG));
    }
    else
    {
      String input = null;

      for (String file : files)
      {
        if (input == null)
        {
          input = file;
        }
        else
        {
          Path inputDir = Paths.get(input);
          if (Files.exists(inputDir) && Files.isDirectory(inputDir))
          {
            Path outputFile = Paths.get(file);
            generate(inputDir, outputFile, flags);
          }
          input = null;
        }
      }
    }
  }

  public static void generate(
    Path inputDir,
    Path outputFile,
    Set<String> flags)
    throws Exception
  {
    System.out.println("Processing icons in %s:".formatted(inputDir.toString()));
    System.out.println("flags: " + flags);

    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);

    Document spriteDoc =
      factory.newDocumentBuilder().newDocument();


    Element spriteRoot = spriteDoc.createElementNS(SVG_NS, "svg");

    spriteRoot.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    spriteDoc.appendChild(spriteRoot);

    if (flags.contains(STACK_FLAG))
    {
      Element style = spriteDoc.createElementNS(SVG_NS, "style");
      style.setTextContent("""
        svg > svg { display: none; }
        svg > svg:target { display: inline; }
        """);
      spriteRoot.appendChild(style);
    }

    List<Path> icons = Files.list(inputDir)
      .filter(p -> p.toString().endsWith(".svg"))
      .sorted(Comparator.comparing(Path::getFileName)).toList();

    if (!icons.isEmpty())
    {
      icons.forEach(path ->
      {
        try
        {
          String id = getId(path);
          System.out.println("Adding svg icon %s".formatted(id));
          Document iconDoc = factory.newDocumentBuilder().parse(path.toFile());
          addIcon(spriteDoc, iconDoc, id, flags);
        }
        catch (Exception ex)
        {
          throw new RuntimeException(ex);
        }
      });

      Files.createDirectories(outputFile.getParent());

      Transformer transformer =
        TransformerFactory.newInstance().newTransformer();

      transformer.setOutputProperty(OutputKeys.INDENT, "yes");
      transformer.setOutputProperty(
        "{http://xml.apache.org/xslt}indent-amount", "2");

      transformer.transform(
        new DOMSource(spriteDoc),
        new StreamResult(outputFile.toFile()));
    }
    else
    {
      System.out.println("No icons found.");
    }
  }

  private static void addIcon(
    Document spriteDoc,
    Document iconDoc,
    String id,
    Set<String> flags)
    throws Exception
  {
    Element iconSvg = iconDoc.getDocumentElement();

    removeWhiteSpace(iconSvg);

    if (flags.contains(NORMALIZE_FLAG))
    {
      normalizeColors(iconSvg, flags);
    }

    if (flags.contains(STACK_FLAG)) // generate a svg stack
    {
      Element innerSvg = spriteDoc.createElementNS(SVG_NS, "svg");

      innerSvg.setAttribute("id", id);

      for (String attribute : STYLE_ATTRIBUTES)
      {
        String value = iconSvg.getAttribute(attribute);
        if (!value.isEmpty())
        {
          innerSvg.setAttribute(attribute, value);
        }
      }

      copyNodes(iconSvg, spriteDoc, innerSvg);
    }
    else // generate svg sprite with symbols
    {
      // generate symbol element
      Element symbol = spriteDoc.createElement("symbol");

      symbol.setAttribute("id", id);

      for (String attribute : STYLE_ATTRIBUTES)
      {
        String value = iconSvg.getAttribute(attribute);
        if (!value.isEmpty())
        {
          symbol.setAttribute(attribute, value);
        }
      }

      copyNodes(iconSvg, spriteDoc, symbol);
    }
  }

  private static void copyNodes(Node iconSvg, Document spriteDoc, Node element)
  {
    Node child = iconSvg.getFirstChild();
    Element spriteRoot = spriteDoc.getDocumentElement();

    while (child != null)
    {
      if (child.getNodeType() == Node.ELEMENT_NODE)
      {
        String nodeName = child.getNodeName();
        if (!SKIP_TAGS.contains(nodeName))
        {
          Node importedNode = spriteDoc.importNode(child, true);
          if (importedNode instanceof Element importedElement)
          {
            NamedNodeMap attributes = importedElement.getAttributes();
            for (int i = attributes.getLength() - 1; i >= 0; i--)
            {
              String attributeName = attributes.item(i).getNodeName();
              int index = attributeName.indexOf(":");
              if (index != -1)
              {
                String ns = attributeName.substring(0, index);
                if (SKIP_ATTRIBUTES.contains(ns))
                {
                  attributes.removeNamedItem(attributeName);
                }
              }
            }
          }
          element.appendChild(importedNode);
        }
      }
      child = child.getNextSibling();
    }
    spriteRoot.appendChild(element);
  }

  private static String getId(Path file)
  {
    String name = file.getFileName().toString();
    int dot = name.lastIndexOf('.');
    return dot == -1 ? name : name.substring(0, dot);
  }

  private static void removeWhiteSpace(Node node)
  {
    Node child = node.getFirstChild();

    while (child != null)
    {
      Node next = child.getNextSibling();

      if (child.getNodeType() == Node.TEXT_NODE
        && child.getTextContent().trim().isEmpty())
      {
        node.removeChild(child);
      }
      else
      {
        removeWhiteSpace(child);
      }

      child = next;
    }
  }

  private static void normalizeColors(Element element, Set<String> flags)
  {
    // Read values from attributes
    String fill = element.hasAttribute("fill") ?
      element.getAttribute("fill").trim() : null;

    String stroke = element.hasAttribute("stroke") ?
      element.getAttribute("stroke").trim() : null;

    // Process the style attribute
    if (element.hasAttribute("style"))
    {
      StringBuilder newStyle = new StringBuilder();

      for (String property : element.getAttribute("style").split(";"))
      {
        property = property.trim();
        if (property.isEmpty())
        {
          continue;
        }

        int p = property.indexOf(':');
        if (p == -1)
        {
          continue;
        }

        String name = property.substring(0, p).trim();
        String value = property.substring(p + 1).trim();

        switch (name)
        {
          case "fill":
            fill = value;
            break;

          case "stroke":
            stroke = value;
            break;

          case "stroke-width":
            break; // remove

          case "color":
            break; // remove

          default:
            if (newStyle.length() > 0)
            {
              newStyle.append(';');
            }
            newStyle.append(name)
              .append(':')
              .append(value);
        }
      }

      if (newStyle.length() == 0)
      {
        element.removeAttribute("style");
      }
      else
      {
        element.setAttribute("style", newStyle.toString());
      }
    }

    // Set attributes
    element.removeAttribute("fill");
    element.removeAttribute("stroke");
    element.removeAttribute("stroke-width");

    // fill
    if (fill == null)
    {
      if (flags.contains(FILL_FLAG))
      {
        element.setAttribute("fill", "currentColor");
      }
      else
      {
        element.setAttribute("fill", "none");
      }
    }
    else if ("none".equalsIgnoreCase(fill))
    {
      element.setAttribute("fill", "none");
    }
    else
    {
      element.setAttribute("fill", "currentColor");
    }

    // stroke
    if (stroke != null && !stroke.isEmpty())
    {
      if ("none".equalsIgnoreCase(stroke))
      {
        element.setAttribute("stroke", "none");
      }
      else if (flags.contains(FILL_FLAG))
      {
        element.setAttribute("stroke", "currentColor");
      }
    }

    // Recursion
    Node child = element.getFirstChild();

    while (child != null)
    {
      if (child.getNodeType() == Node.ELEMENT_NODE)
      {
        normalizeColors((Element) child, flags);
      }
      child = child.getNextSibling();
    }
  }
}
