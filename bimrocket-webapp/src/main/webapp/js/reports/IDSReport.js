/**
 * IDSReport.js
 *
 * Classes for evaluating Information Delivery Specification (IDS) files
 * against BimRocket IFC models. The IDS spec defines applicability facets
 * (which objects to check) and requirement facets (what those objects must
 * satisfy). Each facet type maps to a different piece of IFC model data.
 *
 * IFC data is stored in object.userData with the following key conventions:
 *   userData.IFC              → IFC direct attributes (GlobalId, ifcClassName…)
 *   userData.IFC_type         → IfcTypeObject attributes (PredefinedType…)
 *   userData["IFC_" + pset]   → property set named <pset>
 *   userData["IFC_rel_" + …]  → relation objects
 *   userData["IFC_classification_" + system] → classification entry
 *   userData["IFC_material_layer_" + n]      → material layer entry
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

/**
 * One IDS <specification> element.
 * applicability selects which objects are subject to this specification;
 * requirements defines what those objects must satisfy.
 * Extends Rule so the Report engine can iterate and score objects.
 */
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
    // null means the attribute was absent in the XML; default per IDS spec is 1
    return this.applicability.minOccurs === undefined ?
      1 : this.applicability.minOccurs;
  }

  getMaxOccurs()
  {
    return this.applicability.maxOccurs === undefined ?
      1 : this.applicability.maxOccurs;
  }

  getSeverity()
  {
    return "error";
  }

  // Called by the Report engine to decide whether an object is in scope
  selectObject($)
  {
    if (!this.applicability) return false;
    return this.applicability.evaluate($);
  }

  // Called by the Report engine to flag objects that fail requirements.
  // Returns true when the object FAILS (convention: true = has an issue).
  checkObject($)
  {
    if (!this.requirements) return false;
    return !this.requirements.evaluate($);
  }

  // Returns the failure message for a specific failing object.
  getMessage(object)
  {
    if (this.requirements)
    {
      const $ = (...properties) =>
        ObjectUtils.getObjectValue(object, ...properties);
      this.requirements.evaluate($);
      if (this.requirements.instructionsArray.length > 0)
      {
        return this.requirements.instructionsArray.join(" ");
      }
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

/** Base class for a list of facets with a shared evaluate() contract */
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

/**
 * Applicability section: ALL facets must match (logical AND).
 * An object is in scope only when every facet returns true.
 */
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

/**
 * Requirements section: ALL facets must pass.
 * Unlike applicability, failures are collected so they can be shown in the
 * report message rather than just returning false.
 *
 * Returns true  → all requirements passed.
 * Returns false → at least one requirement failed.
 * instructionsArray is populated with the instructions of each failing facet.
 */
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
    // Empty array → all passed; non-empty → at least one failed
    return this.instructionsArray.length === 0;
  }
}

/** Base class for a single IDS facet */
export class IDSFacet
{
  constructor()
  {
  }

  evaluate($) // abstract
  {
    return false;
  }

  /**
   * Matches an IDS value spec (string or Restriction) against a literal value
   * from the model. String comparison uses strict equality after coercing the
   * literal to string; Restriction delegates to Restriction.matches().
   */
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

/**
 * <entity> facet — matches by IFC class name and optional predefined type.
 * ifcClassName is compared uppercase because IDS enumerations use uppercase
 * (e.g. IFCWALL) while the model may store mixed-case names.
 */
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
      // userData.IFC.ifcClassName may be mixed case; normalise to uppercase
      const ifcClassName = $("IFC", "ifcClassName")?.toUpperCase();
      matchClass = this.matchValue(this.name, ifcClassName);
    }
    else
    {
      matchClass = true;
    }

    if (this.predefinedType)
    {
      // PredefinedType lives in the IfcTypeObject entry (IFC_type), not in IFC
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

/**
 * <partOf> facet — checks that the object is (or is not) a child of an
 * entity matching the inner <entity> spec, optionally via a specific relation.
 *
 * The BimRocket IFC tree wraps each IfcProduct in a group Object3D, so we
 * skip that intermediate node before checking the actual parent product.
 *
 * Cardinality:
 *   "required"   → parent must match (default)
 *   "prohibited" → parent must NOT match
 */
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
    // Each IfcProduct is wrapped in an isGroup container; unwrap to get
    // the actual parent IfcProduct
    if (parent.isGroup)
    {
      parent = parent.parent;
    }

    const $p = (...properties) =>
      ObjectUtils.getObjectValue(parent, ...properties);

    if (this.entity.evaluate($p)) // evaluate parent
    {
      if (typeof this.relation === "string")
      {
        // If a specific relation type is required, verify it exists on the object
        if (this.relationFound($()))
        {
          return this.cardinality === "required";
        }
      }
      else
      {
        // No relation type filter — parent entity match is sufficient
        return this.cardinality === "required";
      }
    }
    return this.cardinality === "prohibited";
  }

  /**
   * Checks whether any IFC_rel_* entry on the object matches the required
   * relation type (e.g. IFCRELAGGREGATES).
   */
  relationFound(object)
  {
    const relationName = this.relation.toUpperCase();
    for (let name in object.userData)
    {
      if (name.startsWith("IFC_rel_"))
      {
        let relProp = object.userData[name];
        let ifcClassName = relProp.ifcClassName?.toUpperCase();
        if (relationName === ifcClassName) return true;
      }
    }
    return false;
  }
}

/**
 * <material> facet — checks material layers stored as IFC_material_layer_N.
 *
 * Cardinality:
 *   "required"   → at least one material layer must exist (and match value if given)
 *   "prohibited" → no material layer may match
 *   "optional"   → if layers exist they must match; absence is also accepted
 *
 * If value is null, only the presence of a non-empty Material name is checked.
 * If value is specified, the Material name must also satisfy the value constraint.
 * A non-matching value always fails, even for optional (optional only relaxes
 * the "must exist" requirement, not the value constraint).
 *
 * Type-level fallback: if no material layers are found on the instance,
 * the IFC type object's userData is also searched (accessible via object.links.ifcType).
 * Instance materials take full precedence — the type is only consulted when the
 * instance has none.
 */
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
    const obj = $();

    // IFC allows material layers to be defined at type level (IfcMaterialLayerSetUsage
    // on IfcWallType) rather than on each instance. The loader stores type-level data
    // in the object linked as "ifcType". We check instance first; if no layers are
    // found there we fall back to the type. Instance always wins if it has any layers.
    const userDatas = [obj.userData];
    const typeUserData = obj.links?.["ifcType"]?.userData;
    if (typeUserData) userDatas.push(typeUserData);

    let matchCount = 0;
    // For value constraints on multi-layer elements: "required" means at least ONE
    // layer must match the value (not ALL layers). This flag tracks whether a match
    // was found so we can apply that check after the full loop.
    let valueMatchFound = false;

    for (const userData of userDatas)
    {
      // Instance had layers → type is not consulted (instance takes precedence)
      if (matchCount > 0 && userData !== obj.userData) break;

      for (let name in userData)
      {
        if (name.startsWith("IFC_material_layer_"))
        {
          matchCount++;

          const materialLayerData = userData[name];
          let value = materialLayerData["Material"] || "";

          if (this.value) // IDS specifies a value constraint on the material name
          {
            if (this.matchValue(this.value, value))
            {
              // A matching layer found: prohibited cardinality fails immediately
              if (this.cardinality === "prohibited") return false;
              valueMatchFound = true; // at least one layer matches
            }
            // Non-matching layer: do NOT fail here — other layers may still match.
            // The final verdict is deferred until all layers are inspected.
          }
          else // IDS only checks whether a material name is present or absent
          {
            if (value)
            {
              if (this.cardinality === "prohibited") return false;
            }
            else
            {
              if (this.cardinality === "required") return false;
            }
          }
        }
      }
    }
    // No layers found at all
    if (this.cardinality === "required" && matchCount === 0) return false;
    // Value constraint specified but no layer matched — fail unless prohibited
    if (this.value && this.cardinality !== "prohibited" && matchCount > 0 && !valueMatchFound)
    {
      return false;
    }
    return true;
  }
}

/**
 * <classification> facet — checks classification references stored as
 * IFC_classification_<systemName> entries in userData.
 *
 * system matches the classification system name (e.g. "Uniclass").
 * value matches the ItemReference code within that system.
 * Same cardinality semantics as IDSMaterial.
 *
 * Type-level fallback: same as IDSMaterial — if no matching classification system
 * is found on the instance, the IFC type's userData is consulted as a fallback.
 */
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
    const obj = $();

    // Same instance-first, type-fallback pattern as IDSMaterial.
    // Classification references can be assigned at type level in some IFC workflows.
    const userDatas = [obj.userData];
    const typeUserData = obj.links?.["ifcType"]?.userData;
    if (typeUserData) userDatas.push(typeUserData);

    let matchCount = 0;

    for (const userData of userDatas)
    {
      // Instance had a matching classification system → skip type
      if (matchCount > 0 && userData !== obj.userData) break;

      for (let name in userData)
      {
        if (name.startsWith("IFC_classification_"))
        {
          // Key format: "IFC_classification_<systemName>" → extract system name
          const systemName = name.substring(19);
          if (this.matchValue(this.system, systemName))
          {
            matchCount++;

            const system = userData[name];
            let value = system["ItemReference"] || "";

            if (this.value) // IDS specifies a value constraint on the classification code
            {
              if (this.matchValue(this.value, value))
              {
                // Code matches: prohibited means this is a violation
                if (this.cardinality === "prohibited") return false;
              }
              else
              {
                // Code does not match: required/optional means constraint is violated
                if (this.cardinality !== "prohibited") return false;
              }
            }
            else // IDS only checks whether a code is present or absent
            {
              if (value)
              {
                if (this.cardinality === "prohibited") return false;
              }
              else
              {
                if (this.cardinality === "required") return false;
              }
            }
          }
        }
      }
    }
    // No matching classification system found at instance or type level
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

/**
 * <property> facet — checks properties inside IfcPropertySets.
 *
 * Property sets are stored as userData["IFC_" + psetName]. The "IFC_" prefix
 * is stripped when extracting psetName so it can be matched against the IDS
 * propertySet value. Non-pset IFC_ keys (IFC_rel_*, IFC_material_*, etc.)
 * are explicitly excluded to avoid false matches.
 *
 * IMPORTANT — pset name convention:
 *   BimRocket's property panel displays pset keys with the "IFC_" prefix
 *   (e.g. "IFC_01-Identificador"). However, the IDS propertySet field must
 *   contain the ACTUAL IFC pset name WITHOUT that prefix (e.g. "01-Identificador"),
 *   because the "IFC_" is added internally by the loader and stripped here before
 *   matching. Writing the BimRocket display name into the IDS will cause all
 *   elements to fail silently.
 *
 * Type-level fallback: IFC allows psets to be defined on the IfcTypeProduct
 * (e.g. IfcWallType) and inherited by all instances. The loader stores type-level
 * psets in the type group's userData, accessible from the instance via
 * object.links.ifcType. If the pset is not found at instance level, the type's
 * userData is searched as a fallback. Instance psets take full precedence.
 *
 * Same cardinality semantics as IDSMaterial.
 */
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
    const obj = $();

    // IFC allows psets to be defined on the IfcTypeProduct (e.g. IfcWallType)
    // and shared by all instances of that type via IFCRELDEFINESBYTYPE.
    // The loader stores type-level psets in the typeGroup linked as "ifcType".
    // We check instance psets first; the type is only consulted if the pset is
    // absent at instance level — matching standard IFC inheritance semantics.
    const userDatas = [obj.userData];
    const typeUserData = obj.links?.["ifcType"]?.userData;
    if (typeUserData) userDatas.push(typeUserData);

    let matchCount = 0;

    for (const userData of userDatas)
    {
      // A matching pset was found at instance level → type-level lookup is skipped.
      // This preserves instance-overrides-type semantics even when both levels
      // define the same pset with different values.
      if (matchCount > 0 && userData !== obj.userData) break;

      for (let name in userData)
      {
        // Only consider property set keys; skip relation, material, classification
        // and type entries that share the "IFC_" prefix
        if (name.startsWith("IFC_") &&
            !name.startsWith("IFC_classification_") &&
            !name.startsWith("IFC_material_") &&
            !name.startsWith("IFC_rel_") &&
            name !== "IFC_type")
        {
          // Key format: "IFC_<psetName>" → extract the actual IFC pset name
          const psetName = name.substring(4);
          if (this.matchValue(this.propertySet, psetName))
          {
            const pset = userData[name];
            for (let propertyName in pset)
            {
              if (this.matchValue(this.baseName, propertyName))
              {
                matchCount++;

                let value = pset[propertyName] || "";

                if (this.value) // IDS specifies a value constraint on the property
                {
                  if (this.matchValue(this.value, value))
                  {
                    // Value matches: prohibited means this is a violation
                    if (this.cardinality === "prohibited") return false;
                  }
                  else
                  {
                    // Value does not match: required/optional means constraint is violated
                    // (optional relaxes existence, not the value constraint itself)
                    if (this.cardinality !== "prohibited") return false;
                  }
                }
                else // IDS only checks whether the property has any non-empty value
                {
                  if (value)
                  {
                    if (this.cardinality === "prohibited") return false;
                  }
                  else
                  {
                    if (this.cardinality === "required") return false;
                  }
                }
              }
            }
          }
        }
      }
    }
    // Property not found at instance or type level
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

/**
 * <attribute> facet — checks direct IFC attributes stored in userData.IFC
 * (e.g. GlobalId, Name, Description, ObjectType…).
 * Same cardinality semantics as IDSMaterial.
 */
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
    // IFC direct attributes live under the "IFC" userData key
    const attributes = $("IFC");
    let matchCount = 0;

    for (let attributeName in attributes)
    {
      if (this.matchValue(this.name, attributeName))
      {
        matchCount++;

        let value = attributes[attributeName] || "";

        if (this.value) // check the Attribute value condition
        {
          if (this.matchValue(this.value, value))
          {
            if (this.cardinality === "prohibited") return false;
          }
          else
          {
            if (this.cardinality !== "prohibited") return false;
          }
        }
        else // check if Attribute has a value
        {
          if (value)
          {
            if (this.cardinality === "prohibited") return false;
          }
          else
          {
            if (this.cardinality === "required") return false;
          }
        }
      }
    }
    if (this.cardinality === "required" && matchCount === 0) return false;
    return true;
  }
}

// ---------------------------------------------------------------------------
// XSD restriction facets — each corresponds to an xs:* constraint element
// ---------------------------------------------------------------------------

/** Base class for a single xs:* restriction constraint */
export class RestrictionFacet
{
  constructor(value)
  {
    this.value = value;
  }

  /**
   * Returns true if this facet is a "required" (AND) constraint.
   * Enumeration overrides this to return false so multiple enumerations
   * are combined with OR instead of AND.
   */
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

/**
 * xs:enumeration — each allowed value is a separate facet.
 * isRequired() returns false so the Restriction engine combines multiple
 * enumerations with OR (value must equal ANY of the listed options).
 */
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

/** xs:pattern — value must match the XSD regular expression */
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

/**
 * Represents an xs:restriction element — a set of RestrictionFacets that
 * collectively determine whether a value is valid.
 *
 * Combining logic mirrors XSD semantics:
 *   - Required facets (range constraints) are ANDed: ALL must pass.
 *   - Non-required facets (enumerations) are ORed: ANY one match is enough.
 *   - Mixed: required facets are ANDed with the result of the OR group.
 *
 * base controls type conversion of constraint values read from XML so that
 * numeric comparisons work correctly (e.g. base="decimal" → parseFloat).
 */
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

  /** Converts a string value from XML to the appropriate JS type based on base */
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

  /**
   * Returns true if the value satisfies all constraints in this restriction.
   * An empty facet list (no constraints) matches everything.
   *
   * Iteration logic:
   *   - First facet always initialises the result.
   *   - Subsequent required facets (range): AND with current result.
   *   - Subsequent non-required facets (enumeration): OR with current result.
   */
  matches(value)
  {
    if (this.facets.length === 0) return true;

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
    return !!match;
  }
}
