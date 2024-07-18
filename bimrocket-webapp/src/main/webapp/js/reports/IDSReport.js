/**
 * IDSReport.js
 *
 * @author realor
 */

import { Report, Rule } from "./Report.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";

export class IDSReport extends Report
{
  constructor()
  {
    super();
  }
}

export class IDSSpecification extends Rule
{
  constructor()
  {
    super();
    this.name = null;
    this.ifcVersion = null; // IFC2X3, IFC4, IFC4X3_ADD2
    this.identifier = null;
    this.description = null;
    this.instructions = null;
    this.applicability = new IDSApplicability();
    this.requirements = null;
  }

  getCode()
  {
    return this.identifier || this.name;
  }

  getDescription()
  {
    return this.description || this.name;
  }

  getMinOccurs()
  {
    return this.applicability.minOccurs || 0;
  }

  getMaxOccurs()
  {
    return this.applicability.maxOccurs || null;
  }

  getSeverity()
  {
    return "error";
  }

  selectObject($)
  {
    if (!this.applicability) return false;
    return this.applicability.evaluate($);
  }

  checkObject($)
  {
    if (!this.requirements) return false;
    return this.requirements.evaluate($);
  }

  getMessage(object)
  {
    if (this.requirements?.instructionsArray.length > 0)
    {
      return this.requirements?.instructionsArray.join(" ");
    }
    return this.instructions || "";
  }

  getSummary(objects)
  {
    return null;
  }

  highlightObjects(application) // selected objects
  {
    return false;
  }
}

export class IDSFacets
{
  constructor()
  {
    this.facets = [];
  }

  evaluate($)
  {
    return false;
  }
}

export class IDSApplicability extends IDSFacets
{
  constructor()
  {
    super();
    this.minOccurs = null; // cardinality
    this.maxOccurs = null;
  }

  evaluate($)
  {
    for (let facet of this.facets)
    {
      if (!facet.evaluate($)) return false;
    }
    return true;
  }
}

export class IDSRequirements extends IDSFacets
{
  constructor()
  {
    super();
    this.description = null;
    this.instructionsArray = [];
  }

  evaluate($)
  {
    this.instructionsArray = [];
    for (let facet of this.facets)
    {
      if (!facet.evaluate($))
      {
        this.instructionsArray.push(facet.instructions || "fail!");
      }
    }
    return this.instructionsArray.length > 0;
  }
}

export class IDSFacet
{
  constructor()
  {
  }

  evaluate($) // abstract
  {
    return false;
  }

  matchValue(idsValue, literalValue)
  {
    if (typeof idsValue === "string")
    {
      return idsValue === String(literalValue);
    }
    else if (idsValue instanceof Restriction)
    {
      return idsValue.matches(literalValue);
    }
    return false;
  }
}

export class IDSEntity extends IDSFacet
{
  constructor()
  {
    super();
    this.name = null;
    this.predefinedType = null;
    this.instructions = null;
  }

  evaluate($)
  {
    let matchClass;
    let matchType;

    if (this.name)
    {
      const ifcClassName = $("IFC", "ifcClassName")?.toUpperCase();
      matchClass = this.matchValue(this.name, ifcClassName);
    }
    else
    {
      matchClass = true;
    }

    if (this.predefinedType)
    {
      const ifcType = $("IFC_type", "PredefinedType");
      matchType = this.matchValue(this.predefinedType, ifcType);
    }
    else
    {
      matchType = true;
    }
    return matchClass && matchType;
  }
}

export class IDSPartOf extends IDSFacet
{
  constructor()
  {
    super();
    this.entity = new IDSEntity(); // IDSEntity
    this.relation = null; // IFCRELAGGREGATES, IFCRELASSIGNSTOGROUP, ...
    this.cardinality = "required"; // "required", "prohibited"
    this.instructions = null; // text
  }

  evaluate($)
  {
    let parent = $().parent;
    if (parent.isGroup) // is IfcProduct group
    {
      parent = parent.parent;
    }

    const $p = (...properties) =>
      ObjectUtils.getObjectValue(parent, ...properties);

    if (this.entity.evaluate($p)) // evaluate parent
    {
      if (typeof this.relation === "string")
      {
        let relType = $("IFC_rel_parent", "ifcClassName");
        if (this.relation.toLowerCase() === relType.toLowerCase())
        {
          return this.cardinality === "required";
        }
      }
      else
      {
        return this.cardinality === "required";
      }
    }
    return this.cardinality === "prohibited";
  }
}

export class IDSMaterial extends IDSFacet
{
  constructor()
  {
    super();
    this.value = null;
    this.uri = null;
    this.cardinality = "required"; // "required", "prohibited", "optional"
    this.instructions = null; // text
  }

  evaluate($)
  {
    const userData = $().userData;
    let matchCount = 0;

    for (let name in userData)
    {
      if (name.startsWith("IFC_material_Layer_"))
      {
        if (this.cardinality === "prohibited") return false;

        const materialLayerData = userData[name];

        matchCount++;

        if (this.value)
        {
          let value = materialLayerData["Material"] || "";
          if (!this.matchValue(this.value, value)) return false;
        }
      }
    }
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

export class IDSClassification extends IDSFacet
{
  constructor()
  {
    super();
    this.system = null;
    this.value = null;
    this.uri = null;
    this.cardinality = "required"; // "required", "prohibited", "optional"
    this.instructions = null; // text
  }

  evaluate($)
  {
    const userData = $().userData;
    let matchCount = 0;

    for (let name in userData)
    {
      if (name.startsWith("IFC_classification_"))
      {
        const systemName = name.substring(19);
        if (this.matchValue(this.system, systemName))
        {
          if (this.cardinality === "prohibited") return false;

          const system = userData[name];

          matchCount++;

          if (this.value)
          {
            let value = system["ItemReference"] || "";
            if (!this.matchValue(this.value, value)) return false;
          }
        }
      }
    }
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

export class IDSProperty extends IDSFacet
{
  constructor()
  {
    super();
    this.propertySet = null; // required
    this.baseName = null; // required
    this.value = null;
    this.dataType = null;
    this.uri = null;
    this.cardinality = "required"; // "required", "prohibited", "optional"
    this.instructions = null; // text
  }

  evaluate($)
  {
    const userData = $().userData;
    let matchCount = 0;

    for (let name in userData)
    {
      if (name.startsWith("IFC_"))
      {
        const psetName = name.substring(4);
        if (this.matchValue(this.propertySet, psetName))
        {
          const pset = userData[name];
          for (let propertyName in pset)
          {
            if (this.matchValue(this.baseName, propertyName))
            {
              if (this.cardinality === "prohibited") return false;

              matchCount++;

              if (this.value)
              {
                let value = pset[propertyName] || "";
                if (!this.matchValue(this.value, value)) return false;
              }
            }
          }
        }
      }
    }
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

export class IDSAttribute extends IDSFacet
{
  constructor()
  {
    super();
    this.name = null; // required
    this.value = null;
    this.cardinality = "required"; // "required", "prohibited", "optional"
    this.instructions = null; // text
  }

  evaluate($)
  {
    const attributes = $("IFC");
    let matchCount = 0;

    for (let attributeName in attributes)
    {
      if (this.matchValue(this.name, attributeName))
      {
        if (this.cardinality === "prohibited") return false;

        matchCount++;

        if (this.value)
        {
          let value = attributes[attributeName] || "";
          if (!this.matchValue(this.value, value)) return false;
        }
      }
    }
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

export class RestrictionFacet
{
  constructor(value)
  {
    this.value = value;
  }

  isRequired()
  {
    return true;
  }

  matches(value)
  {
    return false;
  }
}

export class MinInclusiveFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value >= this.value;
  }
}

export class MinExclusiveFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value > this.value;
  }
}

export class MaxInclusiveFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value <= this.value;
  }
}

export class MaxExclusiveFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value < this.value;
  }
}

export class EnumerationFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  isRequired()
  {
    return false;
  }

  matches(value)
  {
    return value === this.value;
  }
}

export class PatternFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
    this.regexp = new RegExp(value);
  }

  matches(value)
  {
    return value && value.match(this.regexp);
  }
}

class LengthFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value.length === this.value;
  }
}

class MinLengthFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value.length >= this.value;
  }
}

class MaxLengthFacet extends RestrictionFacet
{
  constructor(value)
  {
    super(value);
  }

  matches(value)
  {
    return value.length <= this.value;
  }
}

export class Restriction
{
  static facetTypes = {
    "minInclusive": MinInclusiveFacet,
    "maxInclusive": MaxInclusiveFacet,
    "minExclusive": MinExclusiveFacet,
    "maxExclusive": MaxExclusiveFacet,
    "enumeration": EnumerationFacet,
    "pattern": PatternFacet,
    "length": LengthFacet,
    "minLength": MinLengthFacet,
    "maxLength": MaxLengthFacet
  }

  constructor()
  {
    this.facets = []; // [RestrictionFacet]
    this.base = null;

    // types: minInclusive, minExclusive, maxInclusive, maxExclusive,
    // enumeration, pattern, length, whiteSpace, minLength, maxLength,
    // totalDigits, fractionDigits
  }

  addFacet(type, value)
  {
    const facetClass = Restriction.facetTypes[type];
    if (facetClass)
    {
      const facet = new facetClass(this.convertValue(value));
      this.facets.push(facet);
      return facet;
    }
  }

  convertValue(value)
  {
    switch (this.base)
    {
      case "string":
        return value;
      case "boolean":
        return value === "true" || value === 1;
      case "float":
      case "double":
      case "decimal":
        return parseFloat(value);
    }
    return value;
  }

  matches(value)
  {
    let match = undefined;
    let required = true;

    for (let facet of this.facets)
    {
      required = facet.isRequired();

      if (match === undefined) // first facet
      {
        match = facet.matches(value);
      }
      else
      {
        if (required)
        {
          match &&= facet.matches(value);
        }
        else
        {
          match ||= facet.matches(value);
        }
      }
    }
    return match;
  }
}
