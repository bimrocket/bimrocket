/**
 * IDSReportType.js
 *
 * @author realor
 */

import {
  IDSReport,
  IDSSpecification,
  IDSApplicability,
  IDSRequirements,
  IDSEntity,
  IDSPartOf,
  IDSMaterial,
  IDSClassification,
  IDSProperty,
  IDSAttribute,
  Restriction
} from "./IDSReport.js";
import { ReportType } from "./ReportType.js";

class IDSReportType extends ReportType
{
  constructor()
  {
    super();
  }

  getDescription()
  {
    return "Information Delivery Specification (IDS)";
  }

  getSourceLanguage()
  {
    return "xml";
  }

  getDefaultSource()
  {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS" xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">
  <ids:info>
  </ids:info>
  <ids:specifications>
  </ids:specifications>
</ids:ids>
`;
  }

  parse(source)
  {
    const report = new IDSReport();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(source, "text/xml");
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode)
    {
      throw errorNode.textContent;
    }
    let info = xmlDoc.querySelector("info");
    if (info)
    {
      report.title = info.querySelector("title")?.textContent || null;
      report.version = info.querySelector("version")?.textContent || null;
      report.copyright = info.querySelector("copyright")?.textContent || null;
      report.description = info.querySelector("description")?.textContent || null;
      report.author = info.querySelector("author")?.textContent || null;
      report.date = info.querySelector("date")?.textContent || null;
      report.purpose = info.querySelector("purpose")?.textContent || null;
      report.milestone = info.querySelector("milestone")?.textContent || null;
    }
    let specifications = xmlDoc.querySelector("specifications");
    if (specifications)
    {
      for (let childNode of specifications.children)
      {
        let specification = new IDSSpecification();
        specification.name = childNode.getAttribute("name");
        specification.identifier = childNode.getAttribute("identifier");
        specification.ifcVersion = childNode.getAttribute("ifcVersion");
        specification.description = childNode.getAttribute("description");
        specification.instructions = childNode.getAttribute("instructions");

        let applicabilityNode = childNode.querySelector("applicability");
        this.parseSpecification(specification.applicability, applicabilityNode);

        let requirementsNode = childNode.querySelector("requirements");
        if (requirementsNode)
        {
          specification.requirements = new IDSRequirements();
          this.parseSpecification(specification.requirements, requirementsNode);
        }
        report.rules.push(specification);
      }
    }
    console.info(report);
    return report;
  }

  stringify(report)
  {
  }

  parseSpecification(appReq, node)
  {
    if (appReq instanceof IDSApplicability)
    {
      let value = node.getAttribute("minOccurs");
      if (value === null) appReq.minOccurs = 0;
      else appReq.minOccurs = parseInt(value);

      value = node.getAttribute("maxOccurs");
      if (value === null) appReq.maxOccurs = 1;
      else if (value === "unbounded") appReq.maxOccurs = null;
      else appReq.maxOccurs = parseInt(value);
    }

    for (let childNode of node.children)
    {
      const tagName = this.getTagName(childNode);
      let facet = null;
      switch (tagName)
      {
        case "entity":
          facet = new IDSEntity();
          this.parseEntity(facet, childNode);
          break;
        case "partOf":
          facet = new IDSPartOf();
          this.parsePartOf(facet, childNode);
          break;
        case "material":
          facet = new IDSMaterial();
          this.parseMaterial(facet, childNode);
          break;
        case "classification":
          facet = new IDSClassification();
          this.parseClassification(facet, childNode);
          break;
        case "property":
          facet = new IDSProperty();
          this.parseProperty(facet, childNode);
          break;
        case "attribute":
          facet = new IDSAttribute();
          this.parseAttribute(facet, childNode);
          break;
      }
      if (facet)
      {
        appReq.facets.push(facet);
      }
    }
  }

  parseEntity(entity, node)
  {
    entity.name = this.parseValue(node.querySelector("name"));
    entity.predefinedType = this.parseValue(node.querySelector("predefinedType"));
    entity.instructions = node.getAttribute("instructions");
  }

  parsePartOf(partOf, node)
  {
    this.parseEntity(partOf.entity, node.querySelector("entity"));
    partOf.relation = node.getAttribute("relation") || partOf.relation;
    partOf.cardinality = node.getAttribute("cardinality") || partOf.cardinality;
    partOf.instructions = node.getAttribute("instructions");
  }

  parseMaterial(material, node)
  {
    material.value = this.parseValue(node.querySelector("value"));
    material.uri = node.getAttribute("uri");
    material.cardinality = node.getAttribute("cardinality") || material.cardinality;
    material.instructions = node.getAttribute("instructions");
  }

  parseClassification(classification, node)
  {
    classification.value = this.parseValue(node.querySelector("value"));
    classification.system = this.parseValue(node.querySelector("system"));
    classification.uri = node.getAttribute("uri");
    classification.cardinality = node.getAttribute("cardinality") || classification.cardinality;
    classification.instructions = node.getAttribute("instructions");
  }

  parseProperty(property, node)
  {
    property.propertySet = this.parseValue(node.querySelector("propertySet"));
    property.baseName = this.parseValue(node.querySelector("baseName"));
    property.value = this.parseValue(node.querySelector("value"));
    property.dataType = node.getAttribute("dataType");
    property.uri = node.getAttribute("uri");
    property.cardinality = node.getAttribute("cardinality") || property.cardinality;
    property.instructions = node.getAttribute("instructions");
  }

  parseAttribute(attribute, node)
  {
    attribute.name = this.parseValue(node.querySelector("name"));
    attribute.value = this.parseValue(node.querySelector("value"));
    attribute.cardinality = node.getAttribute("cardinality") || attribute.cardinality;
    attribute.instructions = node.getAttribute("instructions");
  }

  parseValue(node)
  {
    if (node)
    {
      const childNode = node.firstElementChild;
      const tagName = this.getTagName(childNode);
      if (tagName === "simpleValue")
      {
        return childNode.textContent;
      }
      else if (tagName === "restriction")
      {
        const restriction = new Restriction();
        let base = childNode.getAttribute("base");
        if (base)
        {
          let index = base.lastIndexOf(":");
          if (index !== -1) base = base.substring(index + 1);
        }
        restriction.base = base;

        let entryNode = childNode.firstElementChild;
        while (entryNode !== null)
        {
          const type = this.getTagName(entryNode);
          const value = entryNode.getAttribute("value");
          restriction.addFacet(type, value);
          entryNode = entryNode.nextElementSibling;
        }
        return restriction;
      }
    }
    return null;
  }

  getTagName(node)
  {
    let tagName = node.tagName;
    let index = tagName.indexOf(":");
    if (index !== -1)
    {
      tagName = tagName.substring(index + 1);
    }
    return tagName;
  }
}

ReportType.setReportType("ids", new IDSReportType());

export { IDSReportType };
