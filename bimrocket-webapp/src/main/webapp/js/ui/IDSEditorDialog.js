/**
 * IDSEditorDialog.js
 *
 * Visual editor for IDS (Information Delivery Specification) v1.0
 * (buildingSMART standard — https://github.com/buildingSMART/IDS).
 *
 * ─── Conceptual model ──────────────────────────────────────────────────────
 *
 *  IDS file
 *  └─ Info  (title, author, date, …)
 *  └─ Specifications[]
 *      └─ Applicability  → facets that FILTER which elements are checked
 *      └─ Requirements   → facets that define what those elements MUST comply with
 *
 *  Each facet can be one of six types:
 *    • entity         — IFC class / predefined type
 *    • partOf         — spatial or aggregation containment
 *    • classification — external classification code (Uniclass, OmniClass, …)
 *    • attribute      — direct IFC attribute (Name, Tag, ObjectType, …)
 *    • property       — property inside a Pset
 *    • material       — material layer name
 *
 *  Values inside facets can be:
 *    • simpleValue  — exact literal string
 *    • pattern      — XSD regex (built via the friendly _renderPatternField UI)
 *    • enumeration  — list of allowed values
 *    • range        — numeric min/max
 *
 * ─── Editor data model ─────────────────────────────────────────────────────
 *
 *  this._ids = {
 *    title, version, author, date, milestone, copyright, purpose, description,
 *    specifications: [
 *      {
 *        name, identifier, description, instructions,
 *        ifcVersions: ["IFC4"],
 *        applicability: { minOccurs, maxOccurs, cardinality, facets: [] },
 *        requirements:  { facets: [] }
 *      }
 *    ]
 *  }
 *
 * ─── File structure ────────────────────────────────────────────────────────
 *
 *  Module-level constants / helpers
 *    IFC_CLASSES, IFC_VERSIONS, IFC_ATTRS, RELATIONS, DATA_TYPES, FILTER_TYPES
 *    _escRx / _unescRx  — regex literal escaping
 *    PATTERN_OPS        — friendly pattern operations (starts with, contains, …)
 *    _detectPatternOp   — reverse-engineer a regex back into a friendly operation
 *
 *  class IDSEditorDialog
 *    ─ Data model creators  : _newIDS, _newSpec, _newFacet
 *    ─ Model cache          : _getModelCache  (lazy scan of loaded IFC scene)
 *    ─ UI construction      : _buildUI, _makeTabs, _buildInfoTab, _buildSpecsTab
 *    ─ Spec management      : _addSpec, _removeSpec, _moveSpec, _renderSpecList
 *                             _loadSpecToForm, _syncSpecFromForm
 *    ─ Facet section        : _buildFacetSection, _buildFacetCard, _buildFacetForm
 *    ─ Facet-type forms     : _formEntity, _formPartOf, _formClassification,
 *                             _formAttribute, _formProperty, _formMaterial
 *    ─ Widget builders      : _valueField, _valueFieldSel, _renderPatternField,
 *                             _ifcMultiClassField, _uriField
 *    ─ Preview              : _buildPreviewPanel, _updatePreview, _buildPreviewHTML,
 *                             _filterSentence, _requirementSentence, _valueDescription,
 *                             _facetSummary, _vStr
 *    ─ XML                  : _generateXML, _facetXML, _valueXML, _uppercaseValue
 *    ─ Load / Save          : loadFromXml, _parseFacetNode, _importFile, _importContent,
 *                             _saveAction
 *    ─ Actions              : _run, _showXML, _newIdsAction
 *    ─ Lifecycle            : onShow
 *    ─ Helpers              : _row, _inp, _textarea, _iconBtn, _addSpec (CRUD)
 *
 * @author bimrocket
 */

import { Panel } from "./Panel.js";
import { Dialog } from "./Dialog.js";
import { Toast } from "./Toast.js";
import { Controls } from "./Controls.js";
import { I18N } from "../i18n/I18N.js";
import { ReportPanel } from "./ReportPanel.js";

const IFC_CLASSES = [
  "", "IfcActuator", "IfcAirTerminal", "IfcAirTerminalBox",
  "IfcAirToAirHeatRecovery", "IfcAlarm", "IfcAudioVisualAppliance",
  "IfcBeam", "IfcBoiler", "IfcBuildingElementProxy", "IfcBurner",
  "IfcCableCarrierFitting", "IfcCableCarrierSegment", "IfcCableFitting",
  "IfcCableSegment", "IfcChiller", "IfcCoil", "IfcColumn",
  "IfcCommunicationsAppliance", "IfcCompressor", "IfcCondenser",
  "IfcController", "IfcCooledBeam", "IfcCoolingTower", "IfcCovering",
  "IfcCurtainWall", "IfcDamper", "IfcDistributionChamberElement",
  "IfcDoor", "IfcDuctFitting", "IfcDuctSegment", "IfcDuctSilencer",
  "IfcElectricAppliance", "IfcElectricDistributionBoard",
  "IfcElectricFlowStorageDevice", "IfcElectricGenerator",
  "IfcElectricMotor", "IfcElectricTimeControl", "IfcElement",
  "IfcElementAssembly", "IfcEnergyConversionDevice",
  "IfcEvaporativeCooler", "IfcEvaporator",
  "IfcFan", "IfcFilter", "IfcFireSuppressionTerminal",
  "IfcFlowController", "IfcFlowFitting", "IfcFlowInstrument",
  "IfcFlowMeter", "IfcFlowMovingDevice", "IfcFlowSegment",
  "IfcFlowStorageDevice", "IfcFlowTerminal", "IfcFlowTreatmentDevice",
  "IfcFooting", "IfcFurnishingElement", "IfcFurniture",
  "IfcGrid", "IfcHeatExchanger", "IfcHumidifier",
  "IfcInterceptor", "IfcJunctionBox", "IfcLamp", "IfcLightFixture",
  "IfcMedicalDevice", "IfcMember", "IfcMotorConnection",
  "IfcOpeningElement", "IfcOutlet", "IfcPile", "IfcPipeFitting",
  "IfcPipeSegment", "IfcPlate", "IfcProtectiveDevice",
  "IfcPump", "IfcRailing", "IfcRamp", "IfcRampFlight",
  "IfcReinforcingBar", "IfcReinforcingMesh",
  "IfcRoof", "IfcSanitaryTerminal", "IfcSensor", "IfcShadingDevice",
  "IfcSite", "IfcSlab", "IfcSpace", "IfcSpaceHeater", "IfcStair",
  "IfcStairFlight", "IfcSwitchingDevice", "IfcSystemFurnitureElement",
  "IfcTank", "IfcTendon", "IfcTendonAnchor", "IfcTransformer",
  "IfcTransportElement", "IfcTubeBundle", "IfcUnitaryControlElement",
  "IfcUnitaryEquipment", "IfcValve", "IfcVibrationIsolator",
  "IfcVirtualElement", "IfcWall", "IfcWallStandardCase", "IfcWindow"
];

const IFC_VERSIONS = ["IFC2X3", "IFC4", "IFC4X3_ADD2"];

// Standard IFC attributes that can be filtered (direct properties of IfcRoot/IfcObject/IfcElement)
const IFC_ATTRS = [
  "Name", "Description", "ObjectType", "Tag", "GlobalId",
  "PredefinedType", "LongName", "Phase", "OverallHeight", "OverallWidth",
  "ElevationWithFlooring", "CompositionType", "IsExternal"
];

// IDS 1.0 restricts partOf relation to these four values (IFCRELCONNECTSELEMENTS excluded).
const RELATIONS = [
  ["", "— any relation —"],
  ["IFCRELAGGREGATES", "IfcRelAggregates"],
  ["IFCRELASSIGNSTOGROUP", "IfcRelAssignsToGroup"],
  ["IFCRELCONTAINEDINSPATIALSTRUCTURE", "IfcRelContainedInSpatialStructure"],
  ["IFCRELNESTS", "IfcRelNests"]
];

const DATA_TYPES = [
  ["", "— any —"],
  ["IFCTEXT", "IfcText (text)"],
  ["IFCLABEL", "IfcLabel (short text)"],
  ["IFCIDENTIFIER", "IfcIdentifier (code/ID)"],
  ["IFCBOOLEAN", "IfcBoolean (true/false)"],
  ["IFCINTEGER", "IfcInteger (whole number)"],
  ["IFCREAL", "IfcReal (decimal number)"],
  ["IFCLENGTHMEASURE", "IfcLengthMeasure (m)"],
  ["IFCAREAMEASURE", "IfcAreaMeasure (m²)"],
  ["IFCVOLUMEMEASURE", "IfcVolumeMeasure (m³)"],
  ["IFCTIMEMEASURE", "IfcTimeMeasure (s)"],
  ["IFCMASSMEASURE", "IfcMassMeasure (kg)"],
  ["IFCPLANEANGLEMEASURE", "IfcPlaneAngleMeasure (°)"],
  ["IFCTHERMODYNAMICTEMPERATUREMEASURE", "IfcThermodynamicTemperatureMeasure (K)"],
  ["IFCPOWERMEASURE", "IfcPowerMeasure (W)"],
  ["IFCPRESSUREMEASURE", "IfcPressureMeasure (Pa)"]
];

// ─── Pattern builder ──────────────────────────────────────────────────────────
// Friendly operations that the user can choose instead of writing raw regex.
// Each entry: [id, label, toRegex(val), fromRegex(rx) → val|null]
//
// XSD patterns are implicitly anchored (match the whole string), so:
//   "starts with foo"  →  foo.*
//   "ends with foo"    →  .*foo
//   "contains foo"     →  .*foo.*
//   "is exactly foo"   →  foo    (special chars escaped)
//
// Negative variants use XSD negative lookahead (supported in IDS validators):
//   "does not start with foo"  →  (?!foo).*
//   "does not end with foo"    →  .*(?<!foo)   (lookbehind not in XSD; use negative lookahead workaround)
//   "does not contain foo"     →  (?!.*foo).*
//   "is not exactly foo"       →  (?!foo$).*   / or simply use enumeration
//
// Note: negative lookaheads may not be supported by all IDS validators; "Advanced" covers edge cases.

/**
 * Escape a literal string so it is safe to embed inside a regex/XSD-pattern.
 * All special metacharacters are prefixed with a backslash.
 * Example: _escRx("door.A") → "door\\.A"
 */
function _escRx(s)
{
  return s.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Inverse of _escRx — remove backslash escapes from a regex token
 * so the raw user-visible string is recovered.
 * Example: _unescRx("door\\.A") → "door.A"
 */
function _unescRx(s)
{
  return s.replace(/\\([.+*?^${}()|[\]\\])/g, "$1");
}

const PATTERN_OPS = [
  {
    id:      "starts_with",
    label:   "Starts with",
    toRegex: val => _escRx(val) + ".*",
    fromRegex: rx =>
    {
      const m = rx.match(/^((?:[^\\*]|\\.)*)\\?\.\*$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:      "ends_with",
    label:   "Ends with",
    toRegex: val => ".*" + _escRx(val),
    fromRegex: rx =>
    {
      const m = rx.match(/^\.\*((?:[^\\]|\\.)*)$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:      "contains",
    label:   "Contains",
    toRegex: val => ".*" + _escRx(val) + ".*",
    fromRegex: rx =>
    {
      const m = rx.match(/^\.\*((?:[^\\]|\\.)+)\.\*$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:      "is_exactly",
    label:   "Is exactly",
    toRegex: val => _escRx(val),
    fromRegex: rx =>
    {
      // Must not contain unescaped wildcards/quantifiers
      if (/(?<!\\)[.*+?[\]()|{}]/.test(rx)) return null;
      return _unescRx(rx);
    }
  },
  {
    id:      "not_starts_with",
    label:   "Does not start with",
    toRegex: val => "(?!" + _escRx(val) + ").*",
    fromRegex: rx =>
    {
      const m = rx.match(/^\(\?!((?:[^)\\]|\\.)*)\)\.\*$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:      "not_ends_with",
    label:   "Does not end with",
    toRegex: val => ".*(?<!" + _escRx(val) + ")",
    fromRegex: rx =>
    {
      const m = rx.match(/^\.\*\(\?<!((?:[^)\\]|\\.)*)\)$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:      "not_contains",
    label:   "Does not contain",
    toRegex: val => "(?!.*" + _escRx(val) + ").*",
    fromRegex: rx =>
    {
      const m = rx.match(/^\(\?!\.\*((?:[^)\\]|\\.)*)\)\.\*$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:      "is_not_exactly",
    label:   "Is not exactly",
    toRegex: val => "(?!" + _escRx(val) + "$).*",
    fromRegex: rx =>
    {
      const m = rx.match(/^\(\?!((?:[^)\\]|\\.)*)\$\)\.\*$/);
      return m ? _unescRx(m[1]) : null;
    }
  },
  {
    id:       "advanced",
    label:    "Advanced (regex…)",
    toRegex:  val => val,       // value IS the regex
    fromRegex: _rx => null      // never auto-detected as this op
  }
];

/**
 * Try to detect which PATTERN_OPS entry produced `rx` and return { op, val }.
 * Each op is tried in order; the first whose fromRegex() returns a non-null
 * value is used.  Falls back to { op: "advanced", val: rx } when the regex
 * cannot be matched to any known friendly form.
 *
 * @param   {string} rx  - XSD pattern / regex string
 * @returns {{ op: string, val: string }}
 */
function _detectPatternOp(rx)
{
  if (!rx) return { op: "starts_with", val: "" };
  for (const op of PATTERN_OPS)
  {
    if (op.id === "advanced") continue;
    const val = op.fromRegex(rx);
    if (val !== null) return { op: op.id, val };
  }
  return { op: "advanced", val: rx };
}

// Facet types with label keys
const FILTER_TYPES = [
  ["entity",         "ids.facet.entity"],
  ["partOf",         "ids.facet.partOf"],
  ["classification", "ids.facet.classification"],
  ["attribute",      "ids.facet.attribute"],
  ["property",       "ids.facet.property"],
  ["material",       "ids.facet.material"]
];

class IDSEditorDialog extends Panel
{
  constructor(application)
  {
    super(application);
    this.application = application;
    this.id = "ids_editor_panel";
    this.title = "ids.editor.title";
    this.position = "left";

    this._ids = this._newIDS();
    this._selectedSpecIndex = -1;
    this._currentFileName = null;
    this._modelCache = null;   // lazy cache, reset on each onShow()

    // Expose i18n as this.i18n (same object as application.i18n) so that all
    // helper methods and dynamic render functions can use the shorthand guard
    // pattern: `if (this.i18n) this.i18n.update(el)`.
    this.i18n = this.application.i18n;

    this._buildUI();
    this.i18n.updateTree(this.element);
  }

  // ─── Data model ───────────────────────────────────────────────────────────

  /** Return an empty IDS root object with today's date pre-filled. */
  _newIDS()
  {
    return {
      title: "", version: "", author: "", date: new Date().toISOString().substring(0, 10),
      milestone: "", copyright: "", purpose: "", description: "",
      specifications: []
    };
  }

  /**
   * Return a new empty specification object.
   * Defaults to IFC4, required cardinality, empty facet lists.
   */
  _newSpec()
  {
    return {
      name: "New specification", identifier: "", description: "",
      instructions: "", ifcVersions: ["IFC4"],
      applicability: { minOccurs: 0, maxOccurs: null, cardinality: "required", facets: [] },
      requirements: { facets: [] }
    };
  }

  /**
   * Return a new empty facet of the given type, pre-filled with the minimum
   * required structure so the form renderers can always read a safe default.
   * @param {string} type - one of entity | partOf | classification | attribute | property | material
   */
  _newFacet(type)
  {
    const base = { type, instructions: "", cardinality: "required" };
    switch (type)
    {
      case "entity":
        return { ...base, name: { kind: "simpleValue", value: "" }, predefinedType: null };
      case "partOf":
        return { ...base, cardinality: "required",
          entity: { name: { kind: "simpleValue", value: "" }, predefinedType: null },
          relation: "" };
      case "classification":
        return { ...base, uri: "", system: { kind: "simpleValue", value: "" },
          value: { kind: "simpleValue", value: "" } };
      case "attribute":
        return { ...base, name: { kind: "simpleValue", value: "" },
          value: null };
      case "property":
        return { ...base, uri: "", propertySet: { kind: "simpleValue", value: "" },
          baseName: { kind: "simpleValue", value: "" },
          value: null, dataType: "" };
      case "material":
        return { ...base, uri: "", value: { kind: "simpleValue", value: "" } };
      default:
        return base;
    }
  }

  // ─── Model cache (populated lazily on first use per dialog open) ──────────

  /**
   * Scans application.baseObject once per dialog-open to build lookup maps
   * used by model-aware dropdowns and model validation.
   *
   * Returned object shape:
   *   psets   : { psetName: [propName, …] }       — property set → property names
   *   mats    : [materialName, …]                  — material names (THREE + IFC metadata)
   *   clsys   : { systemName: [code, …] }          — classification system → codes
   *   classes : Set<string>                        — IFC class names (uppercased to match
   *                                                  IDS 1.0 convention: "IFCWALL" etc.)
   *
   * The cache is built lazily on first access and reset by onShow() so every
   * dialog open gets a fresh scan of the current scene.
   *
   * @returns {{ psets: Object, mats: string[], clsys: Object, classes: Set<string> }}
   */
  _getModelCache()
  {
    if (this._modelCache) return this._modelCache;

    const psets   = {};   // { psetName: Set<propName> }
    const matsSet = new Set();
    const clsys   = {};   // { systemName: Set<code> }
    const classes = new Set(); // IFC class names present in scene

    const base = this.application && this.application.baseObject;
    if (base)
    {
      base.traverse(obj =>
      {
        const ud = obj.userData;
        if (!ud) return;

        // ── Psets: userData keys with "IFC_" prefix that are plain pset objects ──
        Object.keys(ud).forEach(key =>
        {
          if (!key.startsWith("IFC_")) return;
          if (key === "IFC_type" ||
              key.startsWith("IFC_rel_") ||
              key.startsWith("IFC_material_") ||
              key.startsWith("IFC_classification_") ||
              key.startsWith("IFC_ps_")) return;
          const psetName = key.substring(4); // strip "IFC_" prefix
          const val = ud[key];
          if (val && typeof val === "object" && !Array.isArray(val))
          {
            if (!psets[psetName]) psets[psetName] = new Set();
            Object.keys(val).forEach(prop => psets[psetName].add(prop));
          }
        });

        // ── Classification: userData keys matching ^IFC_class ──
        Object.keys(ud).forEach(key =>
        {
          if (/^IFC_class/i.test(key))
          {
            const code = (typeof ud[key] === "string") ? ud[key] : String(ud[key] ?? "");
            if (!clsys[key]) clsys[key] = new Set();
            if (code) clsys[key].add(code);
          }
        });

        // ── IFC class names ─────────────────────────────────────────────────
        // Store in uppercase to match the IDS 1.0 convention (IFCWALL, IFCSLAB…)
        // so comparisons with IDS entity names work regardless of how the model
        // stores the class names (e.g. "IfcWall" vs "IFCWALL").
        if (ud.IFC && typeof ud.IFC.ifcClassName === "string" && ud.IFC.ifcClassName)
          classes.add(ud.IFC.ifcClassName.toUpperCase());

        // Also check IFC.ClassificationReference if present
        if (ud.IFC && typeof ud.IFC === "object")
        {
          const ifc = ud.IFC;
          if (ifc.ClassificationReference && typeof ifc.ClassificationReference === "object")
          {
            const ref = ifc.ClassificationReference;
            const sys  = ref.ReferencedSource || ref.System || "Unknown";
            const code = ref.Identification || ref.ItemReference || ref.Name || "";
            if (!clsys[sys]) clsys[sys] = new Set();
            if (code) clsys[sys].add(code);
          }
          // Material from IFC metadata
          if (typeof ifc.Material === "string" && ifc.Material)
            matsSet.add(ifc.Material);
        }

        // ── Materials from THREE material ──
        if (obj.material)
        {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => { if (m && m.name) matsSet.add(m.name); });
        }
      });
    }

    // Convert Sets to sorted arrays
    const psetsFinal = {};
    Object.keys(psets).sort().forEach(k =>
    {
      psetsFinal[k] = Array.from(psets[k]).sort();
    });
    const clsysFinal = {};
    Object.keys(clsys).sort().forEach(k =>
    {
      clsysFinal[k] = Array.from(clsys[k]).sort();
    });

    this._modelCache = {
      psets:   psetsFinal,
      mats:    Array.from(matsSet).sort(),
      clsys:   clsysFinal,
      classes  // Set<string> of IFC class names found in the scene
    };
    return this._modelCache;
  }

  // ─── Model validation ─────────────────────────────────────────────────────

  /**
   * Compare every simpleValue constraint in the loaded IDS against the model
   * cache and return a list of mismatches.
   *
   * Checks performed per facet type:
   *   entity        — IFC class name exists in the scene (cache.classes, uppercase)
   *   partOf        — parent entity class exists in the scene
   *   classification — system name known; if yes, code known under that system
   *   property      — Pset name known; if yes, property name known inside that Pset
   *   material      — material name known in the scene
   *   attribute     — SKIPPED: IFC attribute names are standard, not model-specific
   *
   * Only `simpleValue` constraints are examined — pattern / enumeration / range
   * values cannot be validated by simple set-membership lookup.
   *
   * When no model is loaded, `hasModel` is false and all entity/partOf checks are
   * skipped (we have nothing to compare against).  Classification, property and
   * material checks also silently pass because the cache pools are empty and the
   * guard conditions (`sysVal`, `psetVal`) prevent false positives.
   *
   * @returns {Array<{specName:string, field:string, value:string}>}
   */
  _validateIdsAgainstModel()
  {
    // Shorthand for i18n lookup — falls back to the raw key if i18n is not set
    const t     = key => (this.i18n ? this.i18n.get(key) : key);
    const cache = this._getModelCache();
    // hasModel guards class checks which are only meaningful when objects exist
    const hasModel = this.application && this.application.baseObject;
    const issues   = [];

    /**
     * Inner helper: push an issue if `v` is a simpleValue not present in `pool`.
     *
     * @param {Object}    v        - value constraint { kind, value }
     * @param {Set|Array} pool     - known values from the cache
     * @param {string}    specName - display name of the parent specification
     * @param {string}    kindKey  - i18n key for the human-readable field label
     * @param {string}    [ctx]    - optional context suffix (e.g. pset name)
     */
    const check = (v, pool, specName, kindKey, ctx) =>
    {
      if (!v || v.kind !== "simpleValue" || !v.value) return;
      const inPool = (pool instanceof Set) ? pool.has(v.value) : pool.includes(v.value);
      if (!inPool)
      {
        const field = ctx ? `${t(kindKey)} (${ctx})` : t(kindKey);
        issues.push({ specName, field, value: v.value });
      }
    };

    for (const spec of (this._ids.specifications || []))
    {
      const specName = spec.name || "?";
      // Merge applicability and requirements facets — check both sides
      const allFacets = [
        ...(spec.applicability?.facets || []),
        ...(spec.requirements?.facets  || [])
      ];

      for (const f of allFacets)
      {
        switch (f.type)
        {
          case "entity":
            // Guard: only check when the model has IFC objects with known class names
            if (hasModel && cache.classes.size > 0)
              check(f.name, cache.classes, specName, "ids.warn.ifc_class");
            break;

          case "partOf":
            // Check the parent entity class, not the element class itself
            if (hasModel && cache.classes.size > 0)
              check(f.entity?.name, cache.classes, specName, "ids.warn.ifc_class");
            break;

          case "classification":
          {
            // Only validate when the IDS specifies a concrete system name
            const sysVal = (f.system?.kind === "simpleValue") ? f.system.value : null;
            if (sysVal)
            {
              if (!cache.clsys[sysVal])
                // System not found at all in the model
                issues.push({ specName, field: t("ids.warn.cls_system"), value: sysVal });
              else
                // System found — check the code value within that system
                check(f.value, cache.clsys[sysVal], specName, "ids.warn.cls_code", sysVal);
            }
            break;
          }

          case "property":
          {
            // Only validate when the IDS specifies a concrete Pset name
            const psetVal = (f.propertySet?.kind === "simpleValue") ? f.propertySet.value : null;
            if (psetVal)
            {
              if (!cache.psets[psetVal])
                // Pset not found at all in the model
                issues.push({ specName, field: t("ids.warn.pset"), value: psetVal });
              else
                // Pset found — check the property name inside it
                check(f.baseName, cache.psets[psetVal], specName, "ids.warn.property", psetVal);
            }
            break;
          }

          case "material":
            check(f.value, cache.mats, specName, "ids.warn.material");
            break;

          // attribute: IFC attribute names (Name, Description, …) are standard —
          // no model-specific check is meaningful here
        }
      }
    }
    return issues;
  }

  /**
   * Populate and show (or hide) the warning banner at the top of the
   * Specifications tab after an IDS is loaded.
   *
   * Three outcomes:
   *   1. No model open      → blue info notice ("no model loaded, cannot validate")
   *   2. Model open, issues → yellow warning list with a Dismiss button
   *   3. Model open, clean  → banner hidden
   *
   * The banner is rebuilt from scratch on every call (innerHTML cleared first)
   * so loading a second IDS always reflects the fresh set of issues and the
   * dismissed state from the previous load has no carry-over effect.
   *
   * Called from _importContent(), EditIDSAction.js and (for clean-up) _newIdsAction().
   */
  _showModelWarnings()
  {
    if (!this._warnBanner) return;  // guard: banner element not yet built

    const t        = key => (this.i18n ? this.i18n.get(key) : key);
    const hasModel = !!(this.application && this.application.baseObject);

    // Reset banner to a clean state before each rebuild
    this._warnBanner.innerHTML = "";
    this._warnBanner.className = "ids_warn_banner";

    if (!hasModel)
    {
      // ── Outcome 1: no model — show a soft informational notice ────────────
      // The user can still author the IDS but we cannot compare it to anything.
      this._warnBanner.classList.add("ids_warn_info");
      const msg = document.createElement("span");
      msg.textContent = t("ids.warn.no_model");
      this._warnBanner.appendChild(msg);
      this._warnBanner.style.display = "";
      return;
    }

    // ── Outcome 2 or 3: model open — run the comparison ───────────────────
    const issues = this._validateIdsAgainstModel();

    if (issues.length === 0)
    {
      // All values found — no banner needed
      this._warnBanner.style.display = "none";
      return;
    }

    // ── Outcome 2: mismatches found — build the yellow warning banner ──────
    this._warnBanner.classList.add("ids_warn_mismatch");

    // Header row: ⚠ icon + summary text + dismiss button
    const hdr  = document.createElement("div");
    hdr.className = "ids_warn_header";

    const icon = document.createElement("span");
    icon.className   = "ids_warn_icon";
    icon.textContent = "⚠";
    hdr.appendChild(icon);

    const summary = document.createElement("span");
    summary.textContent = t("ids.warn.model_mismatch");
    hdr.appendChild(summary);

    // Dismiss hides the banner for this session; the next IDS load will
    // call _showModelWarnings() again and rebuild from scratch.
    const dismissBtn = document.createElement("button");
    dismissBtn.type      = "button";
    dismissBtn.className = "ids_warn_dismiss";
    dismissBtn.textContent = t("ids.warn.dismiss");
    dismissBtn.addEventListener("click", () => { this._warnBanner.style.display = "none"; });
    hdr.appendChild(dismissBtn);
    this._warnBanner.appendChild(hdr);

    // Issue list — one line per mismatch, grouped naturally by iteration order
    // (applicability facets before requirements, spec order preserved).
    // All text inserted via textContent/createTextNode to prevent XSS:
    // specName, field and value all originate from user-supplied IDS file data.
    const ul = document.createElement("ul");
    ul.className = "ids_warn_list";

    issues.forEach(({ specName, field, value }) =>
    {
      const li   = document.createElement("li");
      const bold = document.createElement("strong");
      bold.textContent = specName;
      li.appendChild(bold);
      li.appendChild(document.createTextNode(` · ${field}: `));
      const code = document.createElement("code");
      code.textContent = value;   // textContent prevents HTML injection
      li.appendChild(code);
      ul.appendChild(li);
    });

    this._warnBanner.appendChild(ul);
    this._warnBanner.style.display = "";
  }

  // ─── UI construction ──────────────────────────────────────────────────────

  /**
   * Build the complete dialog UI once, at construction time.
   * The same DOM is reused across all show/hide cycles; data is refreshed in onShow().
   *
   *  Tabs:
   *    ① Info tab  — global IDS metadata (title, author, …)
   *    ② Specifications tab — list + editor for each specification
   *
   *  Footer buttons (left → right):
   *    New · Open file · Save as file · View XML · Run on model · Close
   */
  _buildUI()
  {
    const body = this.bodyElem;
    body.className += " ids_editor_body";

    this._tabs = this._makeTabs(body, [
      ["ids.tab.info", p => this._buildInfoTab(p)],
      ["ids.tab.specifications", p => this._buildSpecsTab(p)]
    ]);

    // Footer toolbar — placed inside body since Panel has no footer area
    const footer = document.createElement("div");
    footer.className = "ids_panel_footer";
    body.appendChild(footer);

    const mkBtn = (name, key, cb) =>
    {
      const btn = document.createElement("button");
      btn.className = "ids_footer_btn";
      I18N.set(btn, "textContent", key);
      btn.addEventListener("click", cb);
      footer.appendChild(btn);
      return btn;
    };

    mkBtn("new",  "ids.btn.new",          () => this._newIdsAction());
    mkBtn("open", "ids.btn.open",         () => this._importFile());
    mkBtn("save", "ids.btn.save",         () => this._saveAction());
    mkBtn("xml",  "ids.btn.generate_xml", () => this._showXML());
    mkBtn("run",  "ids.btn.run",          () => this._run());

    // Panel-level ResizeObserver: toggles "ids_ui_narrow" on the body element
    // so that ALL form rows (Info tab and Specs tab) stack to one field per line
    // when the panel is narrower than 480 px.  The Specs tab has its own separate
    // observer (on .ids_specs_cols) that handles the list/editor navigation switch.
    if (typeof ResizeObserver !== "undefined")
    {
      const ro = new ResizeObserver(entries =>
      {
        body.classList.toggle("ids_ui_narrow", entries[0].contentRect.width < 480);
      });
      ro.observe(body);
    }
  }

  /**
   * Build a simple CSS-class-toggling tab system.
   * Each tab has a header link (.ids_tab_link) and a panel (.ids_tab_panel).
   * Clicking a link removes "selected" from all siblings, then adds it to
   * the clicked link and its corresponding panel — CSS hides non-selected panels.
   *
   * @param {Element}   parent   - container to append the tabbed pane into
   * @param {Array}     tabDefs  - array of [i18nKey, builderFn(panel)] pairs
   * @returns {Element} the outer pane div
   */
  _makeTabs(parent, tabDefs)
  {
    const pane = document.createElement("div");
    pane.className = "ids_tabbed_pane";
    parent.appendChild(pane);

    const header = document.createElement("div");
    header.className = "ids_tab_header";
    pane.appendChild(header);

    const body = document.createElement("div");
    body.className = "ids_tab_body";
    pane.appendChild(body);

    tabDefs.forEach(([key, builder], i) =>
    {
      const link = document.createElement("a");
      link.href = "#";
      link.className = "ids_tab_link" + (i === 0 ? " selected" : "");
      I18N.set(link, "textContent", key);
      header.appendChild(link);

      const panel = document.createElement("div");
      panel.className = "ids_tab_panel" + (i === 0 ? " selected" : "");
      body.appendChild(panel);

      // Let the builder function populate the panel immediately
      builder(panel);

      link.addEventListener("click", e =>
      {
        e.preventDefault();
        header.querySelectorAll(".ids_tab_link").forEach(l => l.classList.remove("selected"));
        body.querySelectorAll(".ids_tab_panel").forEach(p => p.classList.remove("selected"));
        link.classList.add("selected");
        panel.classList.add("selected");
      });
    });

    if (this.i18n) this.i18n.updateTree(pane);
    return pane;
  }

  // ─── Info tab ─────────────────────────────────────────────────────────────

  /**
   * Populate the Info tab with the IDS global metadata fields.
   *
   *  Row 1:  Title (wide) · Version (narrow) · Milestone (narrow)
   *  Row 2:  Author (wide) · Date (date input) · Copyright (wide)
   *  Row 3:  Purpose textarea · Description textarea  (both grow vertically)
   *
   * Each input is stored as an instance property (this._titleInput, …) so
   * onShow() can reload them without re-building the DOM.
   */
  _buildInfoTab(panel)
  {
    panel.className += " ids_info_panel";

    const row1 = this._row(panel);
    this._titleInput    = this._inp(row1, "ids.info.title",     "ids_wide");
    this._versionInput  = this._inp(row1, "ids.info.version",   "ids_fw_sm");
    this._milestoneInput = this._inp(row1, "ids.info.milestone", "ids_fw_sm");

    const row2 = this._row(panel);
    this._authorInput    = this._inp(row2, "ids.info.author",    "ids_wide");
    this._dateInput      = this._inp(row2, "ids.info.date",      "ids_fw_sm", "date");
    this._copyrightInput = this._inp(row2, "ids.info.copyright", "ids_wide");

    const row3 = this._row(panel, true);
    this._purposeInput = this._textarea(row3, "ids.info.purpose",      "ids_half");
    this._descInput    = this._textarea(row3, "ids.info.description",  "ids_half");
  }

  // ─── Specs tab ────────────────────────────────────────────────────────────

  /**
   * Build the Specifications tab.  Layout: two columns side by side.
   *
   *  Left column  (.ids_specs_list_col)
   *    ┌─ Header with icon buttons: + (add) − (remove) ↑ (up) ↓ (down)
   *    └─ <ul> spec list — clicking an item selects it and loads the form
   *
   *  Right column (.ids_spec_editor)
   *    ├─ "Select a specification" placeholder (shown when nothing selected)
   *    └─ Spec form (hidden until a spec is selected)
   *         ├─ Name / Identifier / Description / Instructions inputs
   *         ├─ IFC version checkboxes
   *         ├─ Applicability section (_buildFacetSection, isRequirement=false)
   *         ├─ Requirements section  (_buildFacetSection, isRequirement=true)
   *         └─ Preview panel (collapsible human-readable summary)
   */
  _buildSpecsTab(panel)
  {
    panel.className += " ids_specs_panel";

    // ── Model-mismatch warning banner ──────────────────────────────────────
    // Sits above the spec columns; hidden by default; populated by
    // _showModelWarnings() each time an IDS file is loaded.
    this._warnBanner = document.createElement("div");
    this._warnBanner.className = "ids_warn_banner";
    this._warnBanner.style.display = "none";
    panel.appendChild(this._warnBanner);

    // ── Inner row container (left list col + right editor col) ─────────────
    // Wrapped so the banner can span full width above both columns.
    // The outer panel uses flex-column; this div uses flex-row.
    // In narrow mode (< 480 px, tracked by ResizeObserver) the class
    // "ids_narrow" is added and only one "view" is visible at a time.
    const cols = document.createElement("div");
    cols.className = "ids_specs_cols";
    panel.appendChild(cols);
    this._specsCols = cols;

    // Left col: spec list
    const left = document.createElement("div");
    left.className = "ids_specs_list_col";
    cols.appendChild(left);

    const lh = document.createElement("div");
    lh.className = "ids_list_header";
    left.appendChild(lh);
    this._iconBtn(lh, "+", "ids.btn.add_spec",    () => this._addSpec());
    this._iconBtn(lh, "−", "ids.btn.remove_spec", () => this._removeSpec());
    this._iconBtn(lh, "↑", "ids.btn.move_up",     () => this._moveSpec(-1));
    this._iconBtn(lh, "↓", "ids.btn.move_down",   () => this._moveSpec(1));

    this._specList = document.createElement("ul");
    this._specList.className = "ids_spec_list";
    left.appendChild(this._specList);

    // Right col: spec editor
    this._specEditor = document.createElement("div");
    this._specEditor.className = "ids_spec_editor";
    cols.appendChild(this._specEditor);

    // Back button — only visible in narrow/mobile mode; takes user back to the list
    this._backBtn = document.createElement("button");
    this._backBtn.className = "ids_back_btn";
    I18N.set(this._backBtn, "textContent", "ids.btn.back_to_list");
    this._backBtn.addEventListener("click", () =>
    {
      this._syncSpecFromForm();
      cols.classList.remove("ids_editor_view");
    });
    this._specEditor.appendChild(this._backBtn);
    if (this.i18n) this.i18n.update(this._backBtn);

    this._specEmptyMsg = document.createElement("div");
    this._specEmptyMsg.className = "ids_empty_msg";
    I18N.set(this._specEmptyMsg, "textContent", "ids.msg.select_spec");
    this._specEditor.appendChild(this._specEmptyMsg);
    if (this.i18n) this.i18n.update(this._specEmptyMsg);

    this._specForm = document.createElement("div");
    this._specForm.className = "ids_spec_form hidden";
    this._specEditor.appendChild(this._specForm);

    this._buildSpecForm(this._specForm);

    // ── ResizeObserver: toggle narrow mode ────────────────────────────────
    // When the columns container is narrower than 480 px (typical for the
    // left panel at its default width or on a phone) switch to a single-view
    // navigation pattern: list → tap spec → editor (back button to return).
    if (typeof ResizeObserver !== "undefined")
    {
      const ro = new ResizeObserver(entries =>
      {
        const w = entries[0].contentRect.width;
        const isNarrow = w < 480;
        cols.classList.toggle("ids_narrow", isNarrow);
        // If we switch to wide mode, always make both columns visible
        if (!isNarrow) cols.classList.remove("ids_editor_view");
      });
      ro.observe(cols);
    }
  }

  /**
   * Populate the spec editor form (right column of the Specifications tab).
   * This DOM is built once; data is loaded/reloaded via _loadSpecToForm().
   *
   * Layout:
   *   Row 1: Name (wide) · Identifier (narrow)
   *   Row 2: Description (full)
   *   Row 3: Instructions (full)
   *   Row 4: IFC version checkboxes (IFC2X3, IFC4, IFC4X3_ADD2)
   *   ──────────────────────────────────────────────────────────
   *   Applicability section (collapsible facet cards)
   *   Requirements section  (collapsible facet cards)
   *   Preview panel (human-readable live summary)
   *
   * Every input fires _syncSpecFromForm() / _updatePreview() on change so
   * the data model stays in sync with what the user sees at all times.
   */
  _buildSpecForm(form)
  {
    // General fields
    const row1 = this._row(form);
    this._specNameInput = this._inp(row1, "ids.spec.name",        "ids_wide");
    this._specIdInput   = this._inp(row1, "ids.spec.identifier",  "ids_fw_sm");

    const row2 = this._row(form);
    this._specDescInput = this._inp(row2, "ids.spec.description", "ids_full");

    const row3 = this._row(form);
    this._specInstInput = this._inp(row3, "ids.spec.instructions","ids_full");

    // IFC versions
    const verRow = this._row(form);
    verRow.classList.add("ids_versions_row"); // enables align-items:center + proper checkbox layout
    const verLabel = document.createElement("span");
    verLabel.className = "ids_versions_label";
    I18N.set(verLabel, "textContent", "ids.spec.ifc_versions");
    verRow.appendChild(verLabel);
    if (this.i18n) this.i18n.update(verLabel);

    this._versionChecks = {};
    IFC_VERSIONS.forEach(v =>
    {
      // Wrap each checkbox+label pair in a span so the gap between pairs is
      // larger than the gap between checkbox and its own label text.
      const pair = document.createElement("span");
      pair.className = "ids_ver_pair";
      const cb  = document.createElement("input");
      cb.type   = "checkbox";
      cb.id     = "ids_ver_" + v;
      const lbl = document.createElement("label");
      lbl.htmlFor = "ids_ver_" + v;
      lbl.textContent = v;
      pair.appendChild(cb);
      pair.appendChild(lbl);
      verRow.appendChild(pair);
      this._versionChecks[v] = cb;
      cb.addEventListener("change", () => this._syncSpecFromForm());
    });

    // Divider
    const div = document.createElement("hr");
    div.className = "ids_divider";
    form.appendChild(div);

    // Applicability section
    this._applicSection = this._buildFacetSection(form, false);

    // Requirements section
    this._reqSection = this._buildFacetSection(form, true);

    // Preview panel (live human-readable summary)
    this._buildPreviewPanel(form);

    // Sync on text change
    [this._specNameInput, this._specIdInput,
     this._specDescInput, this._specInstInput].forEach(inp =>
      inp.addEventListener("input", () => this._syncSpecFromForm())
    );

    // Global listener: update preview on any input change inside the spec form
    form.addEventListener("input",  () => this._updatePreview());
    form.addEventListener("change", () => this._updatePreview());
  }

  // ─── Facet section ────────────────────────────────────────────────────────

  /**
   * Build one collapsible facet section (Applicability OR Requirements).
   *
   * Structure:
   *   ┌─ Header (.ids_section_header)
   *   │    Title label
   *   │    [Facet type <select>] [Add filter/requirement <button>]
   *   ├─ Global cardinality row — only in Applicability
   *   │    Radio buttons: Must · May · Must Not
   *   │    (applies the same cardinality to all facets in the section)
   *   └─ Facet items container (.ids_facet_items)
   *        Populated by _renderFacetItems() when a spec is loaded.
   *
   * Returns a `state` object that is threaded through all facet CRUD methods:
   *   { isRequirement, addSel, itemsEl, sec, globalCardRadios }
   *
   * @param {HTMLElement} parent         - section container
   * @param {boolean}     isRequirement  - false = Applicability, true = Requirements
   * @returns {Object} state
   */
  _buildFacetSection(parent, isRequirement)
  {
    const sec = document.createElement("div");
    sec.className = "ids_facet_section";
    parent.appendChild(sec);

    // Header with title + add controls
    const hdr = document.createElement("div");
    hdr.className = "ids_section_header";
    sec.appendChild(hdr);

    const title = document.createElement("span");
    title.className = "ids_section_title";
    I18N.set(title, "textContent",
      isRequirement ? "ids.section.requirements" : "ids.section.applicability");
    hdr.appendChild(title);
    if (this.i18n) this.i18n.update(title);

    const addGroup = document.createElement("div");
    addGroup.className = "ids_add_facet_group";
    hdr.appendChild(addGroup);

    const addSel = document.createElement("select");
    addSel.className = "ids_add_facet_select";
    FILTER_TYPES.forEach(([val, lKey]) =>
    {
      const o = document.createElement("option");
      o.value = val;
      I18N.set(o, "textContent", lKey);
      addSel.appendChild(o);
    });
    addGroup.appendChild(addSel);
    if (this.i18n) this.i18n.update(addSel);

    const addBtn = document.createElement("button");
    addBtn.className = "ids_add_facet_btn";
    I18N.set(addBtn, "textContent",
      isRequirement ? "ids.btn.add_requirement" : "ids.btn.add_filter");
    addGroup.appendChild(addBtn);
    if (this.i18n) this.i18n.update(addBtn);

    // Global cardinality row for applicability (selected once, applies to all filters)
    let globalCardRadios = null;
    if (!isRequirement)
    {
      const cardRow = document.createElement("div");
      cardRow.className = "ids_global_card_row";

      const cardLabel = document.createElement("span");
      cardLabel.className = "ids_card_label";
      I18N.set(cardLabel, "textContent", "ids.facet.filter_mode");
      cardRow.appendChild(cardLabel);
      if (this.i18n) this.i18n.update(cardLabel);

      const OPTIONS = [
        ["required",   "ids.card.must",     "ids_card_must"],
        ["optional",   "ids.card.may",      "ids_card_may"],
        ["prohibited", "ids.card.must_not", "ids_card_not"]
      ];
      const gid = "gcard_" + Math.random().toString(36).substring(2, 7);
      globalCardRadios = {};
      OPTIONS.forEach(([val, lKey, cls]) =>
      {
        const rb = document.createElement("input");
        rb.type  = "radio";
        rb.name  = gid;
        rb.value = val;
        rb.id    = gid + "_" + val;
        rb.checked = (val === "required");

        const lbl = document.createElement("label");
        lbl.htmlFor   = rb.id;
        lbl.className = "ids_card_btn " + cls;
        I18N.set(lbl, "textContent", lKey);
        cardRow.appendChild(rb);
        cardRow.appendChild(lbl);
        if (this.i18n) this.i18n.update(lbl);
        globalCardRadios[val] = rb;
      });
      sec.appendChild(cardRow);
    }

    // Facet items container
    const itemsEl = document.createElement("div");
    itemsEl.className = "ids_facet_items";
    sec.appendChild(itemsEl);

    const state = { isRequirement, addSel, itemsEl, sec, globalCardRadios };

    // Wire up global cardinality change (applicability only)
    if (!isRequirement && globalCardRadios)
    {
      Object.entries(globalCardRadios).forEach(([val, rb]) =>
      {
        rb.addEventListener("change", () =>
        {
          if (!rb.checked) return;
          const i = this._selectedSpecIndex;
          if (i < 0) return;
          this._ids.specifications[i].applicability.cardinality = val;
          const facets = this._facetList(state);
          if (facets)
          {
            facets.forEach(f => { f.cardinality = val; });
            state.itemsEl.querySelectorAll(".ids_facet_card").forEach(card =>
            {
              const badge = card.querySelector(".ids_facet_badge");
              if (badge)
              {
                badge.className = "ids_facet_badge ids_badge_" + val;
                I18N.set(badge, "textContent", "ids.cardinality." + val);
                if (this.i18n) this.i18n.update(badge);  // update() translates the element itself; updateTree() only translates descendants
              }
            });
          }
          this._updatePreview();
        });
      });
    }

    addBtn.addEventListener("click", () => this._addFacet(state, addSel.value));

    return state;
  }

  // ─── Facet CRUD ───────────────────────────────────────────────────────────

  /**
   * Return the live facets array for the currently-selected specification.
   * Returns null when no spec is selected (guards all CRUD operations).
   */
  _facetList(state)
  {
    const i = this._selectedSpecIndex;
    if (i < 0) return null;
    const spec = this._ids.specifications[i];
    return state.isRequirement ? spec.requirements.facets : spec.applicability.facets;
  }

  /**
   * Add a new facet of the given type to the section, then re-render and
   * auto-expand the newly created card.
   * Guard: only one "entity" facet is allowed per section (IDS rule).
   * For Applicability facets, inherit the section-level global cardinality.
   */
  _addFacet(state, type)
  {
    const facets = this._facetList(state);
    if (!facets) return;
    if (type === "entity" && facets.some(f => f.type === "entity"))
      return; // only one IFC class facet allowed per section
    const facet = this._newFacet(type);
    if (!state.isRequirement)
    {
      // Inherit the current global cardinality (Must / May / Must Not)
      const i = this._selectedSpecIndex;
      if (i >= 0) facet.cardinality = this._ids.specifications[i].applicability.cardinality || "required";
    }
    facets.push(facet);
    this._renderFacetItems(state);
    // Auto-open last facet so the user can fill it in immediately
    const items = state.itemsEl.querySelectorAll(".ids_facet_card");
    const last = items[items.length - 1];
    if (last) this._openFacetCard(last, true);
    this._updatePreview();
  }

  /**
   * Disable the "entity" option in the type <select> when one already exists.
   * Called after every add/remove to keep the UI in sync with the IDS rule
   * that restricts each section to at most one entity facet.
   */
  _updateEntitySelectState(state)
  {
    const facets = this._facetList(state);
    const hasEntity = facets ? facets.some(f => f.type === "entity") : false;
    const opt = state.addSel.querySelector("option[value='entity']");
    if (opt)
    {
      opt.disabled = hasEntity;
      opt.title = hasEntity ? (this.i18n ? this.i18n.get("ids.error.entity_limit") : "") : "";
    }
  }

  /** Remove the facet at `index` from the current spec's facet list and re-render. */
  _removeFacet(state, index)
  {
    const facets = this._facetList(state);
    if (!facets) return;
    facets.splice(index, 1);
    this._renderFacetItems(state);
    this._updatePreview();
  }

  /**
   * Re-render all facet cards inside the section container.
   * Clears the container, then creates one card per facet in the live array.
   * Also refreshes the entity-option disabled state and re-runs i18n.
   */
  _renderFacetItems(state)
  {
    const facets = this._facetList(state);
    state.itemsEl.innerHTML = "";
    if (!facets) return;

    facets.forEach((facet, i) =>
    {
      const card = this._buildFacetCard(state, facet, i);
      state.itemsEl.appendChild(card);
    });
    this._updateEntitySelectState(state);
    if (this.i18n) this.i18n.updateTree(state.itemsEl);
  }

  // ─── Facet card (collapsible) ─────────────────────────────────────────────

  /**
   * Build a collapsible card DOM element for one facet.
   *
   * Anatomy of a card:
   *   ┌─ Bar (.ids_facet_bar)  ← click to toggle open/closed
   *   │    ▶/▼  arrow
   *   │    [cardinality badge]
   *   │    [type label]  e.g. "Property"
   *   │    [summary text]  e.g. "Pset_WallCommon / LoadBearing"
   *   │    [×] remove button
   *   └─ Body (.ids_facet_body)  ← collapsed by default
   *        cardinality radio buttons (Requirements only)
   *        facet-type-specific form fields
   *
   * The summary text is kept live: any input inside the body triggers
   * summaryEl.textContent = _facetSummary(facet).
   *
   * @param {Object}  state  - section state (isRequirement, itemsEl, …)
   * @param {Object}  facet  - live facet data object
   * @param {number}  index  - position in the facets array (for removal)
   * @returns {HTMLElement} the card element
   */
  _buildFacetCard(state, facet, index)
  {
    const card = document.createElement("div");
    card.className = "ids_facet_card";

    // Card header bar
    const bar = document.createElement("div");
    bar.className = "ids_facet_bar";
    card.appendChild(bar);

    // Toggle arrow
    const arrow = document.createElement("span");
    arrow.className = "ids_facet_arrow";
    arrow.textContent = "▶";
    bar.appendChild(arrow);

    // Badge: cardinality for all facets
    const badge = this._cardinalityBadge(facet.cardinality || "required");
    bar.appendChild(badge);

    // Type label
    const typeSpan = document.createElement("span");
    typeSpan.className = "ids_facet_type";
    typeSpan.textContent = this._facetTypeLabel(facet.type);
    bar.appendChild(typeSpan);

    // Summary
    const summary = document.createElement("span");
    summary.className = "ids_facet_summary_text";
    summary.textContent = this._facetSummary(facet);
    bar.appendChild(summary);

    // Remove button
    const del = document.createElement("button");
    del.className = "ids_facet_del_btn";
    del.textContent = "×";
    I18N.set(del, "title", "ids.btn.remove_facet");
    if (this.i18n) this.i18n.update(del);
    del.addEventListener("click", e =>
    {
      e.stopPropagation();
      this._removeFacet(state, index);
    });
    bar.appendChild(del);

    // Collapsible body
    const body = document.createElement("div");
    body.className = "ids_facet_body";
    card.appendChild(body);

    this._buildFacetForm(body, state, facet, summary);

    // Toggle on bar click
    bar.addEventListener("click", () =>
    {
      const open = card.classList.toggle("open");
      arrow.textContent = open ? "▼" : "▶";
    });

    return card;
  }

  _openFacetCard(card, open)
  {
    card.classList.toggle("open", open);
    const arrow = card.querySelector(".ids_facet_arrow");
    if (arrow) arrow.textContent = open ? "▼" : "▶";
  }

  _cardinalityBadge(cardinality)
  {
    const badge = document.createElement("span");
    badge.className = "ids_facet_badge ids_badge_" + (cardinality || "required");
    I18N.set(badge, "textContent", "ids.cardinality." + (cardinality || "required"));
    // update() (not updateTree) — badge is a leaf element with no child nodes to iterate
    if (this.i18n) this.i18n.update(badge);
    return badge;
  }

  _facetTypeLabel(type)
  {
    // Use the same descriptive labels as the "Add filter" dropdown (ids.facet.*)
    // so the card header is consistent with what the user selected.
    // e.g. "Clase IFC (entidad)" instead of the shorter "Entidad".
    const t = key => (this.i18n ? this.i18n.get(key) : key);
    const MAP = {
      entity:         t("ids.facet.entity"),
      partOf:         t("ids.facet.partOf"),
      classification: t("ids.facet.classification"),
      attribute:      t("ids.facet.attribute"),
      property:       t("ids.facet.property"),
      material:       t("ids.facet.material")
    };
    return MAP[type] || type;
  }

  // ─── Facet form ───────────────────────────────────────────────────────────

  /**
   * Populate the body of a facet card with its editable fields.
   *
   * For Requirements: prepends cardinality radio buttons (Required / Optional /
   * Prohibited) that control how strictly the facet must be satisfied.
   *
   * Then delegates to the facet-type-specific form:
   *   _formEntity, _formPartOf, _formClassification,
   *   _formAttribute, _formProperty, _formMaterial
   *
   * For Requirements only: appends an "Instructions" text field at the end
   * (not shown in Applicability because filters don't carry instructions).
   *
   * Finally attaches a generic listener on all inputs/selects to keep the
   * facet summary in the card bar up to date.
   *
   * @param {Element} body       - card body element to populate
   * @param {Object}  state      - section state ({ isRequirement, … })
   * @param {Object}  facet      - live facet data object (mutated by form inputs)
   * @param {Element} summaryEl  - the summary <span> in the card bar to keep live
   */
  _buildFacetForm(body, state, facet, summaryEl)
  {
    // Cardinality toggle only for requirements (filters share global setting at section level)
    if (state.isRequirement)
    {
      const cardRow = document.createElement("div");
      cardRow.className = "ids_cardinality_row";
      body.appendChild(cardRow);

      const cardLabel = document.createElement("span");
      cardLabel.className = "ids_card_label";
      I18N.set(cardLabel, "textContent", "ids.facet.cardinality");
      cardRow.appendChild(cardLabel);

      const OPTIONS = [
        ["required",   "ids.card.must",     "ids_card_must"],
        ["optional",   "ids.card.may",      "ids_card_may"],
        ["prohibited", "ids.card.must_not", "ids_card_not"]
      ];
      const gid = "card_" + Math.random().toString(36).substring(2, 7);
      OPTIONS.forEach(([val, lKey, cls]) =>
      {
        const rb  = document.createElement("input");
        rb.type   = "radio";
        rb.name   = gid;
        rb.value  = val;
        rb.id     = gid + "_" + val;
        rb.checked = (facet.cardinality || "required") === val;

        const lbl = document.createElement("label");
        lbl.htmlFor = rb.id;
        lbl.className = "ids_card_btn " + cls;
        I18N.set(lbl, "textContent", lKey);
        cardRow.appendChild(rb);
        cardRow.appendChild(lbl);

        rb.addEventListener("change", () =>
        {
          if (rb.checked)
          {
            facet.cardinality = val;
            const card = body.closest(".ids_facet_card");
            const b = card?.querySelector(".ids_facet_badge");
            if (b)
            {
              b.className = "ids_facet_badge ids_badge_" + val;
              I18N.set(b, "textContent", "ids.cardinality." + val);
              if (this.i18n) this.i18n.update(b);  // update() translates the element itself; updateTree() only translates descendants
            }
          }
        });
      });
    }

    // Facet-type-specific fields
    const fieldsDiv = document.createElement("div");
    fieldsDiv.className = "ids_facet_fields";
    body.appendChild(fieldsDiv);

    // isReq is forwarded to every form so each can adapt its fields accordingly
    const isReq = state.isRequirement;
    switch (facet.type)
    {
      case "entity":         this._formEntity(fieldsDiv, facet, isReq); break;
      case "partOf":         this._formPartOf(fieldsDiv, facet, isReq); break;
      case "classification": this._formClassification(fieldsDiv, facet, isReq); break;
      case "attribute":      this._formAttribute(fieldsDiv, facet, isReq); break;
      case "property":       this._formProperty(fieldsDiv, facet, isReq); break;
      case "material":       this._formMaterial(fieldsDiv, facet, isReq); break;
    }

    // Instructions field — only in Requirements, not in Applicability/filters
    if (isReq)
    {
      const instRow = this._row(fieldsDiv);
      const instInp = this._inp(instRow, "ids.facet.instructions", "ids_full");
      instInp.value = facet.instructions || "";
      instInp.addEventListener("input", () => { facet.instructions = instInp.value; });
    }

    // Keep summary updated
    const allInputs = fieldsDiv.querySelectorAll("input, select, textarea");
    allInputs.forEach(el =>
    {
      const update = () => { if (summaryEl) summaryEl.textContent = this._facetSummary(facet); };
      el.addEventListener("input",  update);
      el.addEventListener("change", update);
    });
  }

  // ─── Specific facet forms ─────────────────────────────────────────────────
  //
  // Each _form* method receives (parent, facet, isReq) and builds its fields
  // by mutating `facet` directly via getter/setter closures passed to the
  // widget builders (_valueField, _valueFieldSel, _ifcMultiClassField, …).
  //
  // isReq = true  → Requirements context (stricter labels, extra hint text)
  // isReq = false → Applicability/filter context
  //
  // All methods follow the same pattern:
  //   1. Hint paragraph (context-sensitive description)
  //   2. Data fields (rows of widgets)
  //   3. URI field (optional, classification/property/material only)

  /**
   * Entity facet form — IFC class and optional predefined type.
   *
   * Fields:
   *   • IFC Class Filter  (multi-chip selector — _ifcMultiClassField)
   *   • Predefined Type   (_valueField — simple / pattern / enum / range)
   */
  _formEntity(parent, facet, isReq)
  {
    const hint = document.createElement("p");
    hint.className = "ids_hint";
    I18N.set(hint, "textContent", isReq ? "ids.facet.hint.entity_req" : "ids.facet.hint.entity_filter");
    if (this.i18n) this.i18n.update(hint);
    parent.appendChild(hint);

    this._ifcMultiClassField(parent, facet, "name");

    const row = this._row(parent);
    this._valueField(row, "ids.facet.entity.predefined_type", "ids_half",
      () => facet.predefinedType || { kind: "simpleValue", value: "" },
      v  => { facet.predefinedType = v; });
  }

  /**
   * PartOf facet form — containment relation (e.g. door inside a floor).
   *
   * Fields:
   *   • Relation     (<select> from RELATIONS — IfcRelAggregates, etc.)
   *   • IFC Class    (multi-chip selector for the parent entity type)
   *   • Predefined Type of the parent entity (_valueField)
   */
  _formPartOf(parent, facet, isReq)
  {
    const hint = document.createElement("p");
    hint.className = "ids_hint";
    I18N.set(hint, "textContent", "ids.facet.hint.partOf");
    if (this.i18n) this.i18n.update(hint);
    parent.appendChild(hint);

    // Row 1: Relation selector (full width)
    const row1 = this._row(parent);
    const relWrap = document.createElement("div");
    relWrap.className = "ids_field ids_full";
    const relLabel = document.createElement("label");
    I18N.set(relLabel, "textContent", "ids.facet.partOf.relation");
    relWrap.appendChild(relLabel);
    if (this.i18n) this.i18n.update(relLabel);
    const relSel = document.createElement("select");
    relSel.className = "ids_select";
    RELATIONS.forEach(([v, l]) =>
    {
      const o = document.createElement("option");
      o.value = v; o.textContent = l;
      relSel.appendChild(o);
    });
    relSel.value = facet.relation || "";
    relSel.addEventListener("change", () => { facet.relation = relSel.value; });
    relWrap.appendChild(relSel);
    row1.appendChild(relWrap);

    // Row 2: IFC class multi-chip selector
    this._ifcMultiClassField(parent, facet.entity, "name");

    // Row 3: Predefined type value field
    const row3 = this._row(parent);
    this._valueField(row3, "ids.facet.entity.predefined_type", "ids_half",
      () => facet.entity.predefinedType || { kind: "simpleValue", value: "" },
      v  => { facet.entity.predefinedType = v; });
  }

  /**
   * Classification facet form — external code system (Uniclass, OmniClass, …).
   *
   * Fields:
   *   • System  (_valueFieldSel — model-aware, lists classification systems found in scene)
   *   • Value   (_valueFieldSel — filtered by chosen system if one is selected)
   *   • URI     (optional link to the classification authority)
   *
   * The Value dropdown is context-aware: if a system is already selected and
   * the model cache has codes for it, only those codes appear; otherwise all
   * codes from all systems are shown.
   */
  _formClassification(parent, facet, isReq)
  {
    const hint = document.createElement("p");
    hint.className = "ids_hint";
    I18N.set(hint, "textContent", "ids.facet.hint.classification");
    if (this.i18n) this.i18n.update(hint);
    parent.appendChild(hint);

    // Row 1: System — select from model classification systems
    const row1 = this._row(parent);
    this._valueFieldSel(row1, "ids.facet.classification.system", "ids_full",
      () => facet.system,
      v  => { facet.system = v; },
      () => Object.keys(this._getModelCache().clsys)
    );

    // Row 2: Value/code — filter by selected system when possible
    const row2 = this._row(parent);
    this._valueFieldSel(row2, "ids.facet.classification.value", "ids_full",
      () => facet.value,
      v  => { facet.value = v; },
      () =>
      {
        const sys = facet.system;
        if (sys && sys.kind === "simpleValue" && sys.value)
        {
          const cache = this._getModelCache().clsys;
          return cache[sys.value] || [];
        }
        // Return all codes across all systems
        const cache = this._getModelCache().clsys;
        const all = new Set();
        Object.values(cache).forEach(arr => arr.forEach(c => all.add(c)));
        return Array.from(all).sort();
      }
    );

    // Row 3: URI field
    const row3 = this._row(parent);
    this._uriField(row3, facet);
  }

  /**
   * Attribute facet form — direct IFC object attribute (not a Pset property).
   *
   * IFC attributes are built-in fields of IfcRoot / IfcObject / IfcElement:
   * Name, Description, ObjectType, Tag, GlobalId, PredefinedType, etc.
   * These are NOT inside a property set — use a Property facet for Psets.
   *
   * Fields:
   *   • Attribute Name  (_valueFieldSel — dropdown lists IFC_ATTRS constants)
   *   • Value           (_valueField — plain constraint widget, no model dropdown)
   */
  _formAttribute(parent, facet, isReq)
  {
    const hint = document.createElement("p");
    hint.className = "ids_hint";
    I18N.set(hint, "textContent", "ids.facet.hint.attribute");
    if (this.i18n) this.i18n.update(hint);
    parent.appendChild(hint);

    // Row 1: Attribute name — choose from standard IFC_ATTRS list
    const row1 = this._row(parent);
    this._valueFieldSel(row1, "ids.facet.attribute.name", "ids_half",
      () => facet.name,
      v  => { facet.name = v; },
      () => IFC_ATTRS
    );

    // Row 2: Value — plain value field (no model options needed here)
    this._valueField(row1, "ids.facet.attribute.value", "ids_half",
      () => facet.value || { kind: "simpleValue", value: "" },
      v  => { facet.value = v; });
  }

  /**
   * Property facet form — a named property inside a Property Set (Pset).
   *
   * Both fields are model-aware via _getModelCache():
   *   • Property Set  — dropdown lists all Psets found in the loaded model.
   *   • Property Name — dropdown is rebuilt whenever the Pset selection changes,
   *                     showing only properties belonging to the chosen Pset
   *                     (falls back to all property names across all psets when
   *                     no specific Pset is selected or model has no data).
   *
   * Fields:
   *   • PropertySet  (_valueFieldSel — model pset names)
   *   • BaseName     (_valueFieldSel — model prop names, context-filtered)
   *   • Value        (_valueField — numeric or text constraint)
   *   • DataType     (<select> from DATA_TYPES — e.g. IFCTEXT, IFCREAL)
   *   • URI          (optional authority link)
   */
  _formProperty(parent, facet, isReq)
  {
    const hint = document.createElement("p");
    hint.className = "ids_hint";
    I18N.set(hint, "textContent", "ids.facet.hint.property");
    if (this.i18n) this.i18n.update(hint);
    parent.appendChild(hint);

    // ── Row 1: PropertySet name (full width) ──────────────────────────────────
    const row1 = this._row(parent);

    // Container for Pset field — we store a ref so we can rebuild baseName on change
    const psetWrapOuter = document.createElement("div");
    psetWrapOuter.style.width = "100%";
    row1.appendChild(psetWrapOuter);

    this._valueFieldSel(psetWrapOuter, "ids.facet.property.pset", "ids_full",
      () => facet.propertySet,
      v  =>
      {
        facet.propertySet = v;
        // Rebuild baseName options when pset selection changes
        rebuildBaseNameWidget();
      },
      () => Object.keys(this._getModelCache().psets)
    );

    // ── Row 2: Property name (full width, model-aware, rebuilt on pset change) ─
    const row2 = this._row(parent);
    const bnContainer = document.createElement("div");
    bnContainer.style.width = "100%";
    row2.appendChild(bnContainer);

    /** Returns property names to list based on current pset selection */
    const getPropOptions = () =>
    {
      const ps = facet.propertySet;
      if (ps && ps.kind === "simpleValue" && ps.value)
      {
        const cache = this._getModelCache().psets;
        if (cache[ps.value]) return cache[ps.value];
      }
      // Fallback: all unique property names across all psets
      const cache = this._getModelCache().psets;
      const all = new Set();
      Object.values(cache).forEach(arr => arr.forEach(p => all.add(p)));
      return Array.from(all).sort();
    };

    /** Rebuild the baseName widget inside bnContainer */
    const rebuildBaseNameWidget = () =>
    {
      bnContainer.innerHTML = "";
      this._valueFieldSel(bnContainer, "ids.facet.property.name", "ids_full",
        () => facet.baseName,
        v  => { facet.baseName = v; },
        getPropOptions
      );
    };
    rebuildBaseNameWidget();

    // ── Row 3: Value (left, half) + DataType (right, narrow) ─────────────────
    const row3 = this._row(parent);
    this._valueField(row3, "ids.facet.property.value", "ids_half",
      () => facet.value || { kind: "simpleValue", value: "" },
      v  => { facet.value = v; });

    // Data type dropdown
    const dtWrap = document.createElement("div");
    dtWrap.className = "ids_field ids_narrow";
    const dtLabel = document.createElement("label");
    I18N.set(dtLabel, "textContent", "ids.facet.property.data_type");
    dtWrap.appendChild(dtLabel);
    if (this.i18n) this.i18n.update(dtLabel);
    const dtSel = document.createElement("select");
    dtSel.className = "ids_select";
    DATA_TYPES.forEach(([v, l]) =>
    {
      const o = document.createElement("option");
      o.value = v; o.textContent = l;
      dtSel.appendChild(o);
    });
    dtSel.value = facet.dataType || "";
    dtSel.addEventListener("change", () => { facet.dataType = dtSel.value; });
    dtWrap.appendChild(dtSel);
    row3.appendChild(dtWrap);

    // ── Row 4: URI field ──────────────────────────────────────────────────────
    const row4 = this._row(parent);
    this._uriField(row4, facet);
  }

  /**
   * Material facet form — matches elements by their material layer name.
   *
   * Fields:
   *   • Value  (_valueFieldSel — model-aware: lists material names from scene)
   *   • URI    (optional authority link)
   *
   * Leaving Value empty matches elements that have ANY material layer.
   */
  _formMaterial(parent, facet, isReq)
  {
    const hint = document.createElement("p");
    hint.className = "ids_hint";
    I18N.set(hint, "textContent", "ids.facet.hint.material");
    if (this.i18n) this.i18n.update(hint);
    parent.appendChild(hint);

    // Row 1: Value — select from model material names
    const row1 = this._row(parent);
    this._valueFieldSel(row1, "ids.facet.material.value", "ids_full",
      () => facet.value,
      v  => { facet.value = v; },
      () => this._getModelCache().mats
    );

    // Row 2: URI field
    const row2 = this._row(parent);
    this._uriField(row2, facet);
  }

  /**
   * Append an optional URI field to a row.
   * Used in Classification, Property and Material facets to reference the
   * authoritative source of the constraint (e.g. a Uniclass URI).
   * The field writes directly into facet.uri.
   */
  _uriField(row, facet)
  {
    const wrap = document.createElement("div");
    wrap.className = "ids_field ids_full";
    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", "ids.facet.uri");
    if (this.i18n) this.i18n.update(lbl);
    wrap.appendChild(lbl);
    const inp = document.createElement("input");
    inp.type = "url";
    inp.placeholder = "https://identifier.buildingsmart.org/uri/…";
    inp.className = "ids_input";
    inp.value = facet.uri || "";
    inp.addEventListener("input", () => { facet.uri = inp.value.trim(); });
    wrap.appendChild(inp);
    row.appendChild(wrap);
  }

  // ─── Pattern builder UI ───────────────────────────────────────────────────

  /**
   * Renders a friendly pattern builder inside `area`.
   * Shows an operation <select> + a text input; generates the correct XSD regex
   * and calls setter({ kind: "pattern", value: <regex> }).
   * When `cur` already contains a regex, it tries to reverse-detect the operation
   * so the builder re-opens with the original friendly form.
   *
   * @param {Element}  area   - container div (already cleared by caller)
   * @param {Object}   cur    - current value constraint { kind, value }
   * @param {Function} setter - (constraint) => void
   */
  _renderPatternField(area, cur, setter)
  {
    const existing = (cur.kind === "pattern") ? (cur.value || "") : "";
    const { op: initOp, val: initVal } = _detectPatternOp(existing);

    const row = document.createElement("div");
    row.className = "ids_pattern_row";
    area.appendChild(row);

    // Operation selector
    const opSel = document.createElement("select");
    opSel.className = "ids_select ids_pattern_op_sel";
    PATTERN_OPS.forEach(op =>
    {
      const o = document.createElement("option");
      o.value = op.id;
      o.textContent = op.label;
      opSel.appendChild(o);
    });
    opSel.value = initOp;
    row.appendChild(opSel);

    // Value input (hidden for "advanced" — advanced has its own raw input)
    const valInp = document.createElement("input");
    valInp.type = "text";
    valInp.className = "ids_input ids_pattern_val_inp";
    valInp.placeholder = "value…";
    valInp.value = (initOp === "advanced") ? "" : initVal;
    valInp.style.display = (initOp === "advanced") ? "none" : "";
    row.appendChild(valInp);

    // Raw regex input shown only in "advanced" mode
    const advInp = document.createElement("input");
    advInp.type = "text";
    advInp.className = "ids_input ids_pattern_adv_inp";
    advInp.placeholder = "e.g. ^[A-Z]{3}-\\d+$";
    advInp.value = (initOp === "advanced") ? initVal : "";
    advInp.style.display = (initOp === "advanced") ? "" : "none";
    row.appendChild(advInp);

    // Preview line showing the generated regex
    const preview = document.createElement("div");
    preview.className = "ids_pattern_preview";
    area.appendChild(preview);

    const rebuild = () =>
    {
      const opId  = opSel.value;
      const opDef = PATTERN_OPS.find(p => p.id === opId);
      const isAdv = (opId === "advanced");

      valInp.style.display = isAdv ? "none" : "";
      advInp.style.display = isAdv ? "" : "none";

      const rawVal = isAdv ? advInp.value : valInp.value;
      const regex  = opDef ? opDef.toRegex(rawVal) : rawVal;

      preview.textContent = regex ? "regex: " + regex : "";
      setter({ kind: "pattern", value: regex });
      this._updatePreview();
    };

    opSel.addEventListener("change", rebuild);
    valInp.addEventListener("input", rebuild);
    advInp.addEventListener("input", rebuild);

    // Show initial preview without firing setter redundantly
    const opDef = PATTERN_OPS.find(p => p.id === initOp);
    const initRegex = opDef ? opDef.toRegex(initOp === "advanced" ? initVal : initVal) : existing;
    preview.textContent = initRegex ? "regex: " + initRegex : "";
  }

  // ─── Value field (simple/pattern/enum/range) ──────────────────────────────

  /**
   * Build a chip-based multi-class selector for IFC entity names.
   * Writes into obj[prop] as a value constraint:
   *   0 classes → { kind:"simpleValue", value:"" }      (matches any)
   *   1 class   → { kind:"simpleValue", value:"IfcWall" }
   *   2+ classes → { kind:"enumeration", values:["IfcWall","IfcSlab"] }
   *
   * UI:
   *   Chips area — one removable chip per selected class
   *   Add row    — <select> from IFC_CLASSES + "Add" button
   *              — plain text input + "+" button (for custom class names)
   *
   * @param {Element} parent  - container to append into
   * @param {Object}  obj     - object whose property holds the value constraint
   * @param {string}  prop    - property name to read/write ("name")
   */
  _ifcMultiClassField(parent, obj, prop)
  {
    const wrap = document.createElement("div");
    wrap.className = "ids_field ids_full";
    parent.appendChild(wrap);

    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", "ids.facet.entity.ifc_class");
    if (this.i18n) this.i18n.update(lbl);
    wrap.appendChild(lbl);
    // Note: the contextual hint is added by _formEntity (above this widget) so that
    // the text can vary between filter ("ids.facet.hint.entity_filter") and
    // requirement ("ids.facet.hint.entity_req") contexts. No duplicate hint here.

    const chipsArea = document.createElement("div");
    chipsArea.className = "ids_chips_area";
    wrap.appendChild(chipsArea);

    const addRow = document.createElement("div");
    addRow.className = "ids_chips_add_row";
    wrap.appendChild(addRow);

    const sel = document.createElement("select");
    sel.className = "ids_select";
    IFC_CLASSES.forEach(cls =>
    {
      const o = document.createElement("option");
      o.value = cls;
      o.textContent = cls || (this.i18n ? this.i18n.get("ids.value.choose_list") : "— choose from list —");
      sel.appendChild(o);
    });
    addRow.appendChild(sel);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    I18N.set(addBtn, "textContent", "ids.btn.add_class");
    if (this.i18n) this.i18n.update(addBtn);
    addBtn.className = "ids_btn_small";
    addRow.appendChild(addBtn);

    const sep = document.createElement("span");
    sep.className = "ids_chips_sep";
    I18N.set(sep, "textContent", "ids.value.or_type");
    if (this.i18n) this.i18n.update(sep);
    addRow.appendChild(sep);

    const customInp = document.createElement("input");
    customInp.type = "text";
    customInp.placeholder = "IfcWall…";
    customInp.className = "ids_input_inline";
    addRow.appendChild(customInp);

    const addCustomBtn = document.createElement("button");
    addCustomBtn.type = "button";
    addCustomBtn.textContent = "+";
    addCustomBtn.className = "ids_btn_small";
    addRow.appendChild(addCustomBtn);

    const getClasses = () =>
    {
      const v = obj[prop];
      if (!v) return [];
      if (v.kind === "simpleValue") return v.value ? [v.value] : [];
      if (v.kind === "enumeration") return v.values || [];
      return [];
    };

    const saveClasses = (classes) =>
    {
      if (classes.length === 0)
        obj[prop] = { kind: "simpleValue", value: "" };
      else if (classes.length === 1)
        obj[prop] = { kind: "simpleValue", value: classes[0] };
      else
        obj[prop] = { kind: "enumeration", values: [...classes] };
    };

    const renderChips = () =>
    {
      chipsArea.innerHTML = "";
      const classes = getClasses();
      if (classes.length === 0)
      {
        const ph = document.createElement("span");
        ph.className = "ids_chips_placeholder";
        I18N.set(ph, "textContent", "ids.facet.entity.no_class");
        if (this.i18n) this.i18n.update(ph);
        chipsArea.appendChild(ph);
      }
      else
      {
        classes.forEach(cls =>
        {
          const chip = document.createElement("span");
          chip.className = "ids_chip";
          const chipText = document.createElement("span");
          chipText.textContent = cls;
          chip.appendChild(chipText);
          const rm = document.createElement("button");
          rm.type = "button";
          rm.textContent = "×";
          rm.className = "ids_chip_remove";
          rm.addEventListener("click", () =>
          {
            saveClasses(getClasses().filter(c => c !== cls));
            renderChips();
            this._updatePreview();
          });
          chip.appendChild(rm);
          chipsArea.appendChild(chip);
        });
      }
    };

    const addClass = (cls) =>
    {
      cls = cls.trim();
      if (!cls) return;
      const classes = getClasses();
      if (!classes.includes(cls))
      {
        classes.push(cls);
        saveClasses(classes);
        renderChips();
        this._updatePreview();
      }
    };

    addBtn.addEventListener("click", () =>
    {
      addClass(sel.value);
      sel.value = "";
    });

    addCustomBtn.addEventListener("click", () =>
    {
      addClass(customInp.value);
      customInp.value = "";
    });

    customInp.addEventListener("keydown", (e) =>
    {
      if (e.key === "Enter") { e.preventDefault(); addCustomBtn.click(); }
    });

    renderChips();
    return wrap;
  }

  /**
   * Renders a chip-based enumeration editor into `area`.
   *
   * Layout (appended to area in order):
   *   ids_chips_area  — wrapping flex container, one chip per allowed value
   *   ids_chips_add_row — text input + "+" button to add a new value
   *
   * Each chip shows the value text and a "×" remove button.
   * The "+" button (and Enter key on the input) adds the typed value as a chip.
   * Duplicate values are silently ignored; the input is always cleared on submit.
   *
   * getterFn() is called on every interaction to read the current values, so it
   * must reflect the latest state written by setter (i.e. point at the live facet
   * property via the caller's getter closure, not a snapshot).
   *
   * @param {Element}  area      - container to append into (must already be cleared)
   * @param {Function} getterFn  - () => { kind:"enumeration", values:string[] } | any
   * @param {Function} setter    - (val:{ kind, values }) => void; caller is responsible
   *                               for calling _updatePreview() if needed
   */
  _renderEnumerationChips(area, getterFn, setter)
  {
    // Always read from getterFn so post-save calls see the updated array
    const getValues = () =>
    {
      const v = getterFn();
      return (v && v.kind === "enumeration") ? (v.values || []) : [];
    };

    const save = (values) =>
    {
      setter({ kind: "enumeration", values: [...values] });
    };

    const chipsArea = document.createElement("div");
    chipsArea.className = "ids_chips_area";
    area.appendChild(chipsArea);

    const addRow = document.createElement("div");
    addRow.className = "ids_chips_add_row";
    area.appendChild(addRow);

    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "value…";
    inp.className = "ids_input_inline";
    addRow.appendChild(inp);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.className = "ids_btn_small";
    addRow.appendChild(addBtn);

    // Re-renders only the chips area (addRow is stable and stays mounted)
    const renderChips = () =>
    {
      chipsArea.innerHTML = "";
      const values = getValues();
      if (values.length === 0)
      {
        const ph = document.createElement("span");
        ph.className = "ids_chips_placeholder";
        ph.textContent = "—";
        chipsArea.appendChild(ph);
      }
      else
      {
        values.forEach(val =>
        {
          const chip = document.createElement("span");
          chip.className = "ids_chip";
          const chipText = document.createElement("span");
          chipText.textContent = val;
          chip.appendChild(chipText);

          const rm = document.createElement("button");
          rm.type = "button";
          rm.textContent = "×";
          rm.className = "ids_chip_remove";
          rm.addEventListener("click", () =>
          {
            // Filter by identity — safe because duplicates are never added
            save(getValues().filter(v => v !== val));
            renderChips();
            this._updatePreview();
          });
          chip.appendChild(rm);
          chipsArea.appendChild(chip);
        });
      }
    };

    const addValue = () =>
    {
      const v = inp.value.trim();
      if (!v) return;
      const values = getValues();
      if (!values.includes(v)) // silently ignore duplicates
      {
        values.push(v);
        save(values);
        renderChips();
        this._updatePreview();
      }
      inp.value = ""; // always clear, even on duplicate
    };

    addBtn.addEventListener("click", addValue);
    // Enter key on the input also triggers add (prevents form submit via preventDefault)
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addValue(); } });

    renderChips(); // initial render
  }

  /**
   * Generic value constraint widget.
   * Renders a label, a kind <select> (Simple / Pattern / Enumeration / Range),
   * and a context-sensitive input area that changes based on the selected kind:
   *
   *   simpleValue  → plain text <input>
   *   pattern      → friendly pattern builder (_renderPatternField)
   *   enumeration  → chip list with text input + "+" button (_renderEnumerationChips)
   *   range        → two text inputs with a "–" separator (min – max)
   *
   * The setter passed by the caller is responsible for persisting the value and
   * calling _updatePreview() if needed — this widget does not call it directly
   * (except indirectly via _renderEnumerationChips for the enumeration case).
   *
   * @param {Element}  parent     - container to append into
   * @param {string}   labelKey   - i18n key for the label
   * @param {string}   extraClass - width CSS class (ids_half, ids_full, …)
   * @param {Function} getter     - () => current constraint object
   * @param {Function} setter     - (constraint) => void
   * @returns {Element} the outer wrap div
   */
  _valueField(parent, labelKey, extraClass, getter, setter)
  {
    const wrap = document.createElement("div");
    wrap.className = "ids_field ids_value_group " + (typeof extraClass === "string" ? extraClass : "ids_half");
    parent.appendChild(wrap);

    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", labelKey);
    wrap.appendChild(lbl);
    if (this.i18n) this.i18n.update(lbl);

    const kindSel = document.createElement("select");
    kindSel.className = "ids_value_type_sel";
    [
      ["simpleValue",  "ids.value_type.simple"],
      ["pattern",      "ids.value_type.pattern"],
      ["enumeration",  "ids.value_type.enumeration"],
      ["range",        "ids.value_type.range"]
    ].forEach(([v, lKey]) =>
    {
      const o = document.createElement("option");
      o.value = v;
      I18N.set(o, "textContent", lKey);
      kindSel.appendChild(o);
    });
    wrap.appendChild(kindSel);
    if (this.i18n) this.i18n.update(kindSel);

    const area = document.createElement("div");
    area.className = "ids_value_area";
    wrap.appendChild(area);

    const getCurrent = () => getter() || { kind: "simpleValue", value: "" };

    const render = () =>
    {
      area.innerHTML = "";
      const cur = getCurrent();
      kindSel.value = cur.kind || "simpleValue";
      const kind = kindSel.value;

      // Vertical (column) layout for kinds whose controls stack: pattern builder rows,
      // enumeration chip block + add row. Horizontal for range (min–max side by side).
      area.classList.toggle("ids_value_area_col", kind === "enumeration" || kind === "pattern");

      if (kind === "simpleValue")
      {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.value = cur.value || "";
        area.appendChild(inp);
        inp.addEventListener("input", () => setter({ kind: "simpleValue", value: inp.value }));
      }
      else if (kind === "pattern")
      {
        this._renderPatternField(area, cur, setter);
      }
      else if (kind === "enumeration")
      {
        // getCurrent is passed as getterFn so chips always read the live facet state
        this._renderEnumerationChips(area, getCurrent, setter);
      }
      else if (kind === "range")
      {
        const minI = document.createElement("input");
        minI.type = "text"; minI.placeholder = "min";
        minI.style.width = "44%";
        minI.value = cur.kind === "range" ? (cur.min || "") : "";
        const sep = document.createElement("span");
        sep.textContent = "–";
        sep.style.padding = "0 3px";
        const maxI = document.createElement("input");
        maxI.type = "text"; maxI.placeholder = "max";
        maxI.style.width = "44%";
        maxI.value = cur.kind === "range" ? (cur.max || "") : "";
        area.appendChild(minI); area.appendChild(sep); area.appendChild(maxI);
        const upd = () => setter({ kind: "range", min: minI.value, max: maxI.value });
        minI.addEventListener("input", upd);
        maxI.addEventListener("input", upd);
      }
    };

    kindSel.addEventListener("change", () =>
    {
      const k = kindSel.value;
      // Initialise with the correct empty shape for the new kind so getter()
      // returns a valid object when render() calls it immediately after
      setter(k === "enumeration" ? { kind: "enumeration", values: [] } : { kind: k, value: "" });
      render();
    });
    render();
    return wrap;
  }

  // ─── Value field with model-aware select dropdown ─────────────────────────

  /**
   * Extended value constraint widget that adds a model-aware <select> for
   * the simpleValue mode.  Identical to _valueField for pattern/enum/range.
   *
   * When kind = "simpleValue":
   *   • Renders a <select> populated by getOptions() (e.g. Pset names from scene)
   *   • Last option is "— type manually —" which reveals a custom text <input>
   *   • If the stored value is not in the option list it opens in "type manually" mode
   *
   * When kind = "pattern", "enumeration" or "range": same as _valueField.
   *
   * Layout switches to column (ids_value_area_col) for simpleValue and pattern
   * so the stacked controls don't overflow the row horizontally.
   *
   * Like _valueField but when kind="simpleValue" renders a <select> populated
   * from model data (via getOptions), plus a hidden text <input> for custom entry.
   *
   * @param {Element}  parent     - container to append into
   * @param {string}   labelKey   - i18n key for the label
   * @param {string}   extraClass - CSS class (e.g. "ids_half", "ids_full")
   * @param {Function} getter     - () => { kind, value } | null
   * @param {Function} setter     - (val) => void   (val = { kind, value/values/min/max })
   * @param {Function} getOptions - () => string[]  options for the select
   * @returns {Element} the wrap div
   */
  _valueFieldSel(parent, labelKey, extraClass, getter, setter, getOptions)
  {
    const wrap = document.createElement("div");
    wrap.className = "ids_field ids_value_group " + (typeof extraClass === "string" ? extraClass : "ids_half");
    parent.appendChild(wrap);

    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", labelKey);
    wrap.appendChild(lbl);
    if (this.i18n) this.i18n.update(lbl);

    const kindSel = document.createElement("select");
    kindSel.className = "ids_value_type_sel";
    [
      ["simpleValue",  "ids.value_type.simple"],
      ["pattern",      "ids.value_type.pattern"],
      ["enumeration",  "ids.value_type.enumeration"],
      ["range",        "ids.value_type.range"]
    ].forEach(([v, lKey]) =>
    {
      const o = document.createElement("option");
      o.value = v;
      I18N.set(o, "textContent", lKey);
      kindSel.appendChild(o);
    });
    wrap.appendChild(kindSel);
    if (this.i18n) this.i18n.update(kindSel);

    const area = document.createElement("div");
    area.className = "ids_value_area";
    wrap.appendChild(area);

    const getCurrent = () => getter() || { kind: "simpleValue", value: "" };

    const render = () =>
    {
      area.innerHTML = "";
      const cur = getCurrent();
      kindSel.value = cur.kind || "simpleValue";
      const kind = kindSel.value;

      // Column layout: simpleValue (select + custom input stacked), pattern (builder rows),
      // enumeration (chips block + add row). Row layout: range (min–max side by side).
      area.classList.toggle("ids_value_area_col", kind === "simpleValue" || kind === "pattern" || kind === "enumeration");

      if (kind === "simpleValue")
      {
        // ── Model-aware select with IDS-value injection ────────────────────
        // Layout: <select> with model options  +  hidden <input> for custom entry
        //
        // Dropdown population order:
        //   1. "— any —"  (empty value, always first)
        //   2. Injected IDS option  (only when stored value not in model list)
        //   3. Model-derived options  (from getOptions())
        //   4. "— type manually —"  (sentinel to open the text input)
        //
        // This guarantees the stored IDS value is always visible as a selected
        // option, even when no model is loaded or when the value doesn't exist
        // in the open model.  The ⚠ suffix is added only when a model is open
        // so the user can see at a glance that the value needs attention.

        const options      = (typeof getOptions === "function") ? getOptions() : [];
        const currentValue = cur.value || "";
        // Capture once: used in injected option label and in commitCustom closure
        const hasModel     = !!(this.application && this.application.baseObject);

        const selEl = document.createElement("select");
        selEl.className = "ids_select";

        // ① "— any —" option (empty simpleValue — matches any value)
        const anyOpt = document.createElement("option");
        anyOpt.value = "";
        anyOpt.textContent = this.i18n ? this.i18n.get("ids.value.any") : "— any —";
        selEl.appendChild(anyOpt);

        // ② Injected IDS option — added when the stored value is not in the
        //    model's option list.  Ensures round-trip display even with no model.
        //    ⚠ suffix signals a mismatch when a model IS open.
        if (currentValue !== "" && !options.includes(currentValue))
        {
          const injected = document.createElement("option");
          injected.value     = currentValue;
          injected.textContent = hasModel
            ? `${currentValue}  ⚠`   // model open but value absent → warn
            : currentValue;           // no model → show cleanly, no alarm
          injected.className = "ids_sel_opt_ids"; // italic via CSS
          selEl.appendChild(injected);
        }

        // ③ Model-derived options from the lazy cache
        options.forEach(opt =>
        {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          selEl.appendChild(o);
        });

        // ④ "— type manually —" sentinel reveals the text input for free-text entry
        const customOpt = document.createElement("option");
        customOpt.value       = "__custom__";
        customOpt.textContent = this.i18n ? this.i18n.get("ids.value.type_manually") : "— type manually —";
        selEl.appendChild(customOpt);

        // Hidden text input — only shown when "— type manually —" is selected
        const customInp = document.createElement("input");
        customInp.type      = "text";
        customInp.className = "ids_input";
        customInp.style.display   = "none";
        customInp.style.marginTop = "3px";

        // Set initial selection — currentValue is guaranteed to be in the list
        // (either as an injected option or as a model-derived option)
        selEl.value = currentValue;

        // ── Change handler for the select ────────────────────────────────
        selEl.addEventListener("change", () =>
        {
          if (selEl.value === "__custom__")
          {
            // Reveal text input for a brand-new value not in any list
            customInp.style.display = "";
            customInp.value = "";
            customInp.focus();
            setter({ kind: "simpleValue", value: "" });
          }
          else
          {
            customInp.style.display = "none";
            setter({ kind: "simpleValue", value: selEl.value });
          }
          this._updatePreview();
        });

        // Live update while user is typing in the custom input
        customInp.addEventListener("input", () =>
        {
          setter({ kind: "simpleValue", value: customInp.value });
          this._updatePreview();
        });

        // ── Commit handler for the custom text input ──────────────────────
        // On Enter or blur: inject the typed value as a real select option so
        // that switching away (e.g. changing kind to pattern then back) still
        // shows the value rather than reverting to "— any —".
        // customOpt is captured by closure and remains a stable DOM reference.
        const commitCustom = () =>
        {
          const v = customInp.value.trim();
          if (!v) return; // ignore empty confirmation
          // Avoid duplicate options (user may press Enter multiple times)
          const existing = Array.from(selEl.options).find(o => o.value === v);
          if (!existing)
          {
            const o = document.createElement("option");
            o.value       = v;
            o.textContent = hasModel ? `${v}  ⚠` : v;
            o.className   = "ids_sel_opt_ids";
            // Insert before the sentinel so the option appears in the list body
            selEl.insertBefore(o, customOpt);
          }
          selEl.value = v;
          customInp.style.display = "none";
          setter({ kind: "simpleValue", value: v });
          this._updatePreview();
        };
        customInp.addEventListener("blur",    commitCustom);
        customInp.addEventListener("keydown", e => { if (e.key === "Enter") commitCustom(); });

        area.appendChild(selEl);
        area.appendChild(customInp);
      }
      else if (kind === "pattern")
      {
        this._renderPatternField(area, cur, setter);
      }
      else if (kind === "enumeration")
      {
        // getCurrent as getterFn so chips always read the live facet state.
        // _renderEnumerationChips calls _updatePreview internally — no wrapper needed.
        this._renderEnumerationChips(area, getCurrent, setter);
      }
      else if (kind === "range")
      {
        const minI = document.createElement("input");
        minI.type = "text"; minI.placeholder = "min";
        minI.style.width = "44%";
        minI.value = cur.kind === "range" ? (cur.min || "") : "";
        const sep = document.createElement("span");
        sep.textContent = "–";
        sep.style.padding = "0 3px";
        const maxI = document.createElement("input");
        maxI.type = "text"; maxI.placeholder = "max";
        maxI.style.width = "44%";
        maxI.value = cur.kind === "range" ? (cur.max || "") : "";
        area.appendChild(minI); area.appendChild(sep); area.appendChild(maxI);
        const upd = () =>
        {
          setter({ kind: "range", min: minI.value, max: maxI.value });
          this._updatePreview();
        };
        minI.addEventListener("input", upd);
        maxI.addEventListener("input", upd);
      }
    };

    kindSel.addEventListener("change", () =>
    {
      const k = kindSel.value;
      // Initialise with the correct empty shape so getter() is valid when render() runs
      setter(k === "enumeration" ? { kind: "enumeration", values: [] } : { kind: k, value: "" });
      render();
    });
    render();
    return wrap;
  }

  // ─── Spec list management ─────────────────────────────────────────────────

  /** Sync current form, push a blank spec, select it and load it. */
  _addSpec()
  {
    this._syncSpecFromForm();
    const spec = this._newSpec();
    this._ids.specifications.push(spec);
    this._selectedSpecIndex = this._ids.specifications.length - 1;
    this._renderSpecList();
    this._loadSpecToForm(this._selectedSpecIndex);
    // In narrow mode, navigate to the editor view for the new spec
    if (this._specsCols?.classList.contains("ids_narrow"))
      this._specsCols.classList.add("ids_editor_view");
  }

  /**
   * Remove the currently-selected spec.
   * Selection moves to the previous item, or hides the editor if the list is empty.
   */
  _removeSpec()
  {
    const i = this._selectedSpecIndex;
    if (i < 0) return;
    this._ids.specifications.splice(i, 1);
    this._selectedSpecIndex = Math.min(i, this._ids.specifications.length - 1);
    this._renderSpecList();
    if (this._selectedSpecIndex >= 0) this._loadSpecToForm(this._selectedSpecIndex);
    else this._showSpecEditor(false);
  }

  /**
   * Swap the selected spec with its neighbour in direction `dir` (−1 = up, +1 = down).
   * Syncs the form first to avoid losing unsaved edits.
   */
  _moveSpec(dir)
  {
    const i = this._selectedSpecIndex;
    const specs = this._ids.specifications;
    const j = i + dir;
    if (j < 0 || j >= specs.length) return;
    this._syncSpecFromForm();
    [specs[i], specs[j]] = [specs[j], specs[i]];
    this._selectedSpecIndex = j;
    this._renderSpecList();
    this._loadSpecToForm(j);
  }

  _renderSpecList()
  {
    this._specList.innerHTML = "";
    this._ids.specifications.forEach((spec, i) =>
    {
      const li = document.createElement("li");
      li.className = "ids_spec_item" + (i === this._selectedSpecIndex ? " selected" : "");

      const num = document.createElement("span");
      num.className = "ids_spec_num";
      num.textContent = (i + 1);
      li.appendChild(num);

      const name = document.createElement("span");
      name.textContent = spec.name || ("Spec " + (i + 1));
      li.appendChild(name);

      li.addEventListener("click", () =>
      {
        this._syncSpecFromForm();
        this._selectedSpecIndex = i;
        this._renderSpecList();
        this._loadSpecToForm(i);
        // In narrow mode, switch to the editor view after selecting a spec
        if (this._specsCols?.classList.contains("ids_narrow"))
          this._specsCols.classList.add("ids_editor_view");
      });
      this._specList.appendChild(li);
    });
  }

  /** Toggle between the "select a specification" placeholder and the actual form. */
  _showSpecEditor(show)
  {
    this._specEmptyMsg.style.display = show ? "none" : "";
    this._specForm.classList.toggle("hidden", !show);
    // In narrow mode, go back to the list when there's nothing to show
    if (!show) this._specsCols?.classList.remove("ids_editor_view");
  }

  /**
   * Load the spec at `index` into the form fields without rebuilding the DOM.
   * Also re-renders all facet cards for the spec's applicability and requirements,
   * and restores the global cardinality radio state.
   * @param {number} index - index in this._ids.specifications
   */
  _loadSpecToForm(index)
  {
    this._showSpecEditor(true);
    const spec = this._ids.specifications[index];

    this._specNameInput.value = spec.name || "";
    this._specIdInput.value   = spec.identifier || "";
    this._specDescInput.value = spec.description || "";
    this._specInstInput.value = spec.instructions || "";

    IFC_VERSIONS.forEach(v =>
    {
      this._versionChecks[v].checked = (spec.ifcVersions || []).includes(v);
    });

    this._renderFacetItems(this._applicSection);
    this._renderFacetItems(this._reqSection);

    // Sync global applicability cardinality selector
    if (this._applicSection.globalCardRadios)
    {
      const card = spec.applicability.cardinality || "required";
      Object.entries(this._applicSection.globalCardRadios).forEach(([val, rb]) =>
      {
        rb.checked = (val === card);
      });
    }

    this._updatePreview();
  }

  /**
   * Write all form field values back into the data model for the current spec.
   * Called before switching spec, before export, and on every text input event.
   * Also refreshes the spec list item label to reflect any name change.
   */
  _syncSpecFromForm()
  {
    const i = this._selectedSpecIndex;
    if (i < 0) return;
    const spec = this._ids.specifications[i];
    spec.name         = this._specNameInput.value;
    spec.identifier   = this._specIdInput.value;
    spec.description  = this._specDescInput.value;
    spec.instructions = this._specInstInput.value;
    spec.ifcVersions  = IFC_VERSIONS.filter(v => this._versionChecks[v].checked);

    // Update list item label
    const items = this._specList.querySelectorAll(".ids_spec_item");
    if (items[i])
    {
      const span = items[i].querySelector("span:last-child");
      if (span) span.textContent = spec.name || ("Spec " + (i + 1));
    }
    this._updatePreview();
  }

  // ─── Human-readable preview ───────────────────────────────────────────────

  /**
   * Append a collapsible preview panel at the bottom of the spec form.
   * The panel is collapsed by default and re-renders lazily when opened.
   *
   * When expanded it shows a human-readable English description of the
   * whole specification (applicability + requirements) generated by
   * _buildPreviewHTML().  Updated by _updatePreview() on every change.
   */
  _buildPreviewPanel(form)
  {
    const divider = document.createElement("hr");
    divider.className = "ids_divider";
    form.appendChild(divider);

    // Collapsible header
    const toggle = document.createElement("div");
    toggle.className = "ids_preview_toggle";
    const toggleArrow = document.createElement("span");
    toggleArrow.className = "ids_preview_arrow";
    toggleArrow.textContent = "▶";
    toggle.appendChild(toggleArrow);
    const toggleLabel = document.createElement("span");
    toggleLabel.className = "ids_preview_toggle_label";
    I18N.set(toggleLabel, "textContent", "ids.preview.summary");
    toggle.appendChild(toggleLabel);
    if (this.i18n) this.i18n.update(toggleLabel);
    form.appendChild(toggle);

    this._previewEl = document.createElement("div");
    this._previewEl.className = "ids_preview_box hidden";
    form.appendChild(this._previewEl);

    toggle.addEventListener("click", () =>
    {
      const open = this._previewEl.classList.toggle("hidden");
      toggle.querySelector(".ids_preview_arrow").textContent = open ? "▶" : "▼";
      if (!open) this._updatePreview();
    });
  }

  /**
   * Refresh the preview panel content.
   * Short-circuits if the panel is collapsed (hidden) to avoid unnecessary work.
   */
  _updatePreview()
  {
    if (!this._previewEl || this._previewEl.classList.contains("hidden")) return;
    const i = this._selectedSpecIndex;
    if (i < 0) { this._previewEl.innerHTML = ""; return; }
    const spec = this._ids.specifications[i];
    this._previewEl.innerHTML = "";
    this._previewEl.appendChild(this._buildPreviewHTML(spec));
  }

  _buildPreviewHTML(spec)
  {
    const box = document.createElement("div");
    box.className = "ids_preview_content";

    // Title row
    const titleRow = document.createElement("div");
    titleRow.className = "ids_preview_title_row";

    const titleEl = document.createElement("span");
    titleEl.className = "ids_preview_name";
    titleEl.textContent = `"${spec.name || 'Unnamed specification'}"`;
    titleRow.appendChild(titleEl);

    if (spec.ifcVersions?.length)
    {
      const vers = document.createElement("span");
      vers.className = "ids_preview_versions";
      vers.textContent = spec.ifcVersions.join(", ");
      titleRow.appendChild(vers);
    }
    box.appendChild(titleRow);

    if (spec.identifier)
    {
      const idEl = document.createElement("div");
      idEl.className = "ids_preview_id";
      idEl.textContent = `ID: ${spec.identifier}`;
      box.appendChild(idEl);
    }

    // Applicability
    const appFacets = spec.applicability?.facets || [];
    const reqFacets = spec.requirements?.facets || [];

    if (appFacets.length === 0 && reqFacets.length === 0)
    {
      const empty = document.createElement("p");
      empty.className = "ids_preview_empty";
      I18N.set(empty, "textContent", "ids.preview.no_facets");
      if (this.i18n) this.i18n.update(empty);
      box.appendChild(empty);
      return box;
    }

    // Filters paragraph
    if (appFacets.length > 0)
    {
      const lead = document.createElement("p");
      lead.className = "ids_preview_lead";
      I18N.set(lead, "textContent", "ids.preview.filters_intro");
      if (this.i18n) this.i18n.update(lead);
      box.appendChild(lead);

      const ul = document.createElement("ul");
      ul.className = "ids_preview_list";
      appFacets.forEach(f =>
      {
        const li = document.createElement("li");
        li.className = "ids_preview_filter_item";
        li.innerHTML = this._filterSentence(f);
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    // Requirements paragraph
    if (reqFacets.length > 0)
    {
      const lead2 = document.createElement("p");
      lead2.className = "ids_preview_lead";
      I18N.set(lead2, "textContent", appFacets.length > 0 ? "ids.preview.req_intro" : "ids.preview.req_intro_alone");
      if (this.i18n) this.i18n.update(lead2);
      box.appendChild(lead2);

      const ul2 = document.createElement("ul");
      ul2.className = "ids_preview_list";
      reqFacets.forEach(f =>
      {
        const li = document.createElement("li");
        li.className = "ids_preview_req_item ids_preview_card_" + (f.cardinality || "required");
        li.innerHTML = this._requirementSentence(f);
        ul2.appendChild(li);
      });
      box.appendChild(ul2);
    }

    return box;
  }

  /**
   * Generate an HTML sentence describing one Applicability facet in plain English.
   * Each sentence starts with a cardinality badge (Must exist / May exist / Must not exist)
   * followed by a facet-type-specific description using _vStr() to format values.
   * @returns {string} HTML string (safe — values are passed through _vStr, not raw)
   */
  _filterSentence(f)
  {
    const v = o => { const s = this._vStr(o); return s ? `<strong>${s}</strong>` : "<em>(any)</em>"; };
    const card = f.cardinality || "required";
    const FILTER_BADGE = {
      required:   `<span class="ids_pv_badge ids_badge_required">Must exist</span>`,
      optional:   `<span class="ids_pv_badge ids_badge_optional">May exist</span>`,
      prohibited: `<span class="ids_pv_badge ids_badge_prohibited">Must not exist</span>`
    };
    const badge = FILTER_BADGE[card] || FILTER_BADGE.required;
    switch (f.type)
    {
      case "entity":
      {
        let s = `${badge} Are of IFC class ${v(f.name)}`;
        if (this._vStr(f.predefinedType))
          s += ` with predefined type ${v(f.predefinedType)}`;
        return s;
      }
      case "partOf":
      {
        let s = `${badge} Are part of a ${v(f.entity?.name)}`;
        if (this._vStr(f.entity?.predefinedType))
          s += ` (${this._vStr(f.entity.predefinedType)})`;
        if (f.relation) s += ` via <em>${f.relation}</em>`;
        return s;
      }
      case "classification":
      {
        let s = `${badge} Are classified`;
        if (this._vStr(f.system)) s += ` in system ${v(f.system)}`;
        if (this._vStr(f.value))  s += ` with code ${v(f.value)}`;
        return s;
      }
      case "attribute":
      {
        let s = `${badge} Have attribute ${v(f.name)}`;
        if (this._vStr(f.value)) s += ` = ${v(f.value)}`;
        return s;
      }
      case "property":
      {
        let s = `${badge} Have property ${v(f.baseName)}`;
        if (this._vStr(f.propertySet)) s += ` in set ${v(f.propertySet)}`;
        if (this._vStr(f.value))       s += ` = ${v(f.value)}`;
        return s;
      }
      case "material":
      {
        let s = `${badge} Have material`;
        if (this._vStr(f.value)) s += ` named ${v(f.value)}`;
        return s;
      }
      default: return `${badge} • ${f.type}`;
    }
  }

  /**
   * Generate an HTML sentence describing one Requirement facet in plain English.
   * Like _filterSentence but shows the cardinality badge as Required / Optional /
   * Prohibited, and uses _valueDescription() for richer value constraint text
   * (e.g. "starts with 'W-'" instead of raw regex).
   * @returns {string} HTML string
   */
  _requirementSentence(f)
  {
    const v    = o => { const s = this._vStr(o); return s ? `<strong>"${s}"</strong>` : ""; };
    const card = f.cardinality || "required";
    const BADGE = {
      required:   `<span class="ids_pv_badge ids_badge_required">Required</span>`,
      optional:   `<span class="ids_pv_badge ids_badge_optional">Optional</span>`,
      prohibited: `<span class="ids_pv_badge ids_badge_prohibited">Prohibited</span>`
    };
    const badge = BADGE[card] || BADGE.required;

    switch (f.type)
    {
      case "entity":
      {
        let s = `${badge} IFC class ${v(f.name) || "<em>(any)</em>"}`;
        if (this._vStr(f.predefinedType))
          s += ` · predefined type ${v(f.predefinedType)}`;
        return s;
      }
      case "partOf":
      {
        let s = `${badge} be part of ${v(f.entity?.name) || "<em>(any entity)</em>"}`;
        if (f.relation) s += ` via <em>${f.relation}</em>`;
        return s;
      }
      case "classification":
      {
        let s = `${badge} classification`;
        if (this._vStr(f.system)) s += ` in system ${v(f.system)}`;
        if (this._vStr(f.value))  s += ` · code ${v(f.value)}`;
        return s;
      }
      case "attribute":
      {
        let s = `${badge} attribute ${v(f.name) || "<em>(name required)</em>"}`;
        if (this._vStr(f.value))
          s += ` · value ${this._valueDescription(f.value)}`;
        if (f.instructions) s += ` <em class="ids_pv_inst">(${f.instructions})</em>`;
        return s;
      }
      case "property":
      {
        let s = `${badge} property ${v(f.baseName) || "<em>(name required)</em>"}`;
        if (this._vStr(f.propertySet)) s += ` in set ${v(f.propertySet)}`;
        if (f.dataType)                s += ` · type <em>${f.dataType}</em>`;
        if (this._vStr(f.value))       s += ` · value ${this._valueDescription(f.value)}`;
        if (f.instructions) s += ` <em class="ids_pv_inst">(${f.instructions})</em>`;
        return s;
      }
      case "material":
      {
        let s = `${badge} material`;
        if (this._vStr(f.value)) s += ` named ${v(f.value)}`;
        if (f.instructions) s += ` <em class="ids_pv_inst">(${f.instructions})</em>`;
        return s;
      }
      default: return `${badge} ${f.type}`;
    }
  }

  /** Human-readable description of a value constraint */
  _valueDescription(v)
  {
    if (!v) return "";
    if (v.kind === "simpleValue")
      return `<strong>"${v.value || ""}"</strong>`;
    if (v.kind === "pattern")
    {
      const { op, val } = _detectPatternOp(v.value || "");
      const opDef = PATTERN_OPS.find(p => p.id === op);
      const label = opDef ? opDef.label.toLowerCase() : "matching";
      return val
        ? `<strong>${label}</strong> <em>"${val}"</em>`
        : `matching pattern <code>${v.value || ""}</code>`;
    }
    if (v.kind === "enumeration")
      return `one of [${(v.values || []).map(x => `<strong>"${x}"</strong>`).join(", ")}]`;
    if (v.kind === "range")
    {
      if (v.min && v.max) return `between <strong>${v.min}</strong> and <strong>${v.max}</strong>`;
      if (v.min) return `≥ <strong>${v.min}</strong>`;
      if (v.max) return `≤ <strong>${v.max}</strong>`;
    }
    return "";
  }

  // ─── Facet summary helpers ────────────────────────────────────────────────

  /**
   * Return a compact one-line text string that summarises a facet.
   * Used as the secondary label in the collapsed card bar.
   * No HTML — plain text only.
   */
  _facetSummary(facet)
  {
    const v = o => this._vStr(o);
    switch (facet.type)
    {
      case "entity":         return v(facet.name) || "—";
      case "partOf":         return v(facet.entity?.name) || "—";
      case "classification": return [v(facet.system), v(facet.value)].filter(Boolean).join(" / ") || "—";
      case "attribute":      return v(facet.name) || "—";
      case "property":       return [v(facet.propertySet), v(facet.baseName)].filter(Boolean).join(" / ") || "—";
      case "material":       return v(facet.value) || "—";
      default: return "—";
    }
  }

  /**
   * Convert a value constraint object to a compact display string (no HTML).
   *   simpleValue  → the value itself, e.g. "IfcWall"
   *   pattern      → "~foo.*" (tilde prefix signals it is a regex)
   *   enumeration  → "IfcWall|IfcSlab"
   *   range        → "[1.5,3.0]"
   */
  _vStr(v)
  {
    if (!v) return "";
    if (v.kind === "simpleValue") return v.value || "";
    if (v.kind === "pattern")     return "~" + (v.value || "");
    if (v.kind === "enumeration") return (v.values || []).join("|");
    if (v.kind === "range")       return `[${v.min || ""},${v.max || ""}]`;
    return "";
  }

  // ─── XML generation ───────────────────────────────────────────────────────

  /**
   * Sync both global metadata and the currently-displayed spec into the data model
   * before exporting.  Must be called first by any export path.
   */
  _syncAll()
  {
    const ids = this._ids;
    ids.title       = this._titleInput.value;
    ids.version     = this._versionInput.value;
    ids.milestone   = this._milestoneInput.value;
    ids.author      = this._authorInput.value;
    ids.date        = this._dateInput.value;
    ids.copyright   = this._copyrightInput.value;
    ids.purpose     = this._purposeInput.value;
    ids.description = this._descInput.value;
    this._syncSpecFromForm();
  }

  /**
   * Serialize the complete IDS data model to a buildingSMART IDS 1.0 XML string.
   *
   * Output structure:
   *   <ids:ids xmlns:ids="…" xmlns:xs="…" xsi:schemaLocation="…">
   *     <ids:info> title, version, author, date, … </ids:info>
   *     <ids:specifications>
   *       <ids:specification name="…" ifcVersion="…" …>
   *         <ids:applicability minOccurs="…" maxOccurs="…">
   *           (facet elements)
   *         </ids:applicability>
   *         <ids:requirements>
   *           (facet elements)
   *         </ids:requirements>
   *       </ids:specification>
   *       …
   *     </ids:specifications>
   *   </ids:ids>
   *
   * All user-supplied text is XML-escaped via the inner `x()` helper.
   * @returns {string} complete UTF-8 XML document string
   */
  _generateXML()
  {
    this._syncAll();
    const ids = this._ids;
    const L = [];
    const x = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

    L.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    L.push('<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS"');
    L.push('  xmlns:xs="http://www.w3.org/2001/XMLSchema"');
    L.push('  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    L.push('  xsi:schemaLocation="http://standards.buildingsmart.org/IDS http://standards.buildingsmart.org/IDS/1.0/ids.xsd">');
    L.push('  <ids:info>');
    if (ids.title)       L.push(`    <ids:title>${x(ids.title)}</ids:title>`);
    if (ids.version)     L.push(`    <ids:version>${x(ids.version)}</ids:version>`);
    if (ids.author)      L.push(`    <ids:author>${x(ids.author)}</ids:author>`);
    if (ids.date)        L.push(`    <ids:date>${x(ids.date)}</ids:date>`);
    if (ids.milestone)   L.push(`    <ids:milestone>${x(ids.milestone)}</ids:milestone>`);
    if (ids.copyright)   L.push(`    <ids:copyright>${x(ids.copyright)}</ids:copyright>`);
    if (ids.purpose)     L.push(`    <ids:purpose>${x(ids.purpose)}</ids:purpose>`);
    if (ids.description) L.push(`    <ids:description>${x(ids.description)}</ids:description>`);
    L.push('  </ids:info>');
    L.push('  <ids:specifications>');

    for (const spec of ids.specifications)
    {
      const vers = (spec.ifcVersions || []).join(" ");
      const attr = [
        `name="${x(spec.name || "")}"`,
        vers ? `ifcVersion="${vers}"` : null,
        spec.identifier   ? `identifier="${x(spec.identifier)}"` : null,
        spec.description  ? `description="${x(spec.description)}"` : null,
        spec.instructions ? `instructions="${x(spec.instructions)}"` : null
      ].filter(Boolean).join(" ");

      L.push(`    <ids:specification ${attr}>`);

      const app = spec.applicability;
      const maxOcc = app.maxOccurs === null ? "unbounded" : String(app.maxOccurs ?? 1);
      L.push(`      <ids:applicability minOccurs="${app.minOccurs ?? 0}" maxOccurs="${maxOcc}">`);
      (app.facets || []).forEach(f => L.push(...this._facetXML(f, "        ", x, false)));
      L.push("      </ids:applicability>");

      L.push("      <ids:requirements>");
      (spec.requirements.facets || []).forEach(f => L.push(...this._facetXML(f, "        ", x, true)));
      L.push("      </ids:requirements>");
      L.push("    </ids:specification>");
    }

    L.push("  </ids:specifications>");
    L.push("</ids:ids>");
    return L.join("\n");
  }

  /**
   * Serialize one facet object to an array of IDS XML lines.
   *
   * Cardinality rules per IDS 1.0:
   *   - Applicability: omit cardinality attribute when "required" (the default).
   *   - Requirements: always write cardinality.
   *
   * IFC class names in the entity/partOf name field are uppercased because
   * the IDS schema expects them in uppercase (IFCWALL, IFCSLAB, …).
   *
   * Value constraints are serialized by _valueXML():
   *   simpleValue  → <ids:simpleValue>text</ids:simpleValue>
   *   pattern      → <xs:restriction base="xs:string"><xs:pattern value="…"/></xs:restriction>
   *   enumeration  → <xs:restriction …><xs:enumeration value="…"/>…</xs:restriction>
   *   range        → <xs:restriction base="xs:double"><xs:minInclusive …/>…</xs:restriction>
   *
   * @param {Object}   facet   - facet data object
   * @param {string}   ind     - indentation prefix string
   * @param {Function} x       - XML-escape function (char → &entity;)
   * @param {boolean}  isReq   - true = requirements context
   * @returns {string[]} array of XML lines for this facet
   */
  _facetXML(facet, ind, x, isReq = true)
  {
    const L = [];
    // For requirements: always write cardinality. For applicability: only if not default "required".
    const card = isReq
      ? (facet.cardinality ? ` cardinality="${facet.cardinality}"` : "")
      : (facet.cardinality && facet.cardinality !== "required" ? ` cardinality="${facet.cardinality}"` : "");
    const inst = facet.instructions ? ` instructions="${x(facet.instructions)}"` : "";
    const uri  = facet.uri ? ` uri="${x(facet.uri)}"` : "";
    const vxml = v => this._valueXML(v, x);
    const vxmlUp = v => this._valueXML(this._uppercaseValue(v), x);

    switch (facet.type)
    {
      case "entity":
        L.push(`${ind}<ids:entity${card}${inst}>`);
        L.push(`${ind}  <ids:name>${vxmlUp(facet.name)}</ids:name>`);
        if (this._vStr(facet.predefinedType))
          L.push(`${ind}  <ids:predefinedType>${vxml(facet.predefinedType)}</ids:predefinedType>`);
        L.push(`${ind}</ids:entity>`);
        break;

      case "partOf":
        L.push(`${ind}<ids:partOf${card}${facet.relation ? ` relation="${facet.relation}"` : ""}${inst}>`);
        L.push(`${ind}  <ids:entity>`);
        L.push(`${ind}    <ids:name>${vxmlUp(facet.entity?.name)}</ids:name>`);
        if (this._vStr(facet.entity?.predefinedType))
          L.push(`${ind}    <ids:predefinedType>${vxml(facet.entity.predefinedType)}</ids:predefinedType>`);
        L.push(`${ind}  </ids:entity>`);
        L.push(`${ind}</ids:partOf>`);
        break;

      case "classification":
        L.push(`${ind}<ids:classification${card}${uri}${inst}>`);
        if (this._vStr(facet.system)) L.push(`${ind}  <ids:system>${vxml(facet.system)}</ids:system>`);
        if (this._vStr(facet.value))  L.push(`${ind}  <ids:value>${vxml(facet.value)}</ids:value>`);
        L.push(`${ind}</ids:classification>`);
        break;

      case "attribute":
        L.push(`${ind}<ids:attribute${card}${inst}>`);
        L.push(`${ind}  <ids:name>${vxml(facet.name)}</ids:name>`);
        if (this._vStr(facet.value)) L.push(`${ind}  <ids:value>${vxml(facet.value)}</ids:value>`);
        L.push(`${ind}</ids:attribute>`);
        break;

      case "property":
        L.push(`${ind}<ids:property${card}${facet.dataType ? ` dataType="${facet.dataType}"` : ""}${uri}${inst}>`);
        L.push(`${ind}  <ids:propertySet>${vxml(facet.propertySet)}</ids:propertySet>`);
        L.push(`${ind}  <ids:baseName>${vxml(facet.baseName)}</ids:baseName>`);
        if (this._vStr(facet.value)) L.push(`${ind}  <ids:value>${vxml(facet.value)}</ids:value>`);
        L.push(`${ind}</ids:property>`);
        break;

      case "material":
        L.push(`${ind}<ids:material${card}${uri}${inst}>`);
        if (this._vStr(facet.value)) L.push(`${ind}  <ids:value>${vxml(facet.value)}</ids:value>`);
        L.push(`${ind}</ids:material>`);
        break;
    }
    return L;
  }

  /**
   * Return a copy of value constraint `v` with string content uppercased.
   * Used for IFC class names (entity names must be uppercase in IDS XML).
   * Pattern values are left unchanged — regex is case-sensitive by design.
   */
  _uppercaseValue(v)
  {
    if (!v) return v;
    if (v.kind === "simpleValue")
      return { kind: "simpleValue", value: (v.value || "").toUpperCase() };
    if (v.kind === "enumeration")
      return { kind: "enumeration", values: (v.values || []).map(s => s.toUpperCase()) };
    return v;
  }

  /**
   * Serialize a value constraint object to the IDS/XSD inline XML fragment.
   * Returns a self-contained string ready to embed as child content of a
   * <ids:name>, <ids:value>, <ids:system>, etc. element.
   *
   * @param {Object}   v  - value constraint { kind, value/values/min/max }
   * @param {Function} x  - XML-escape function
   * @returns {string} XML fragment string
   */
  _valueXML(v, x)
  {
    if (!v || !v.kind) return "<ids:simpleValue></ids:simpleValue>";
    if (v.kind === "simpleValue")
      return `<ids:simpleValue>${x(v.value || "")}</ids:simpleValue>`;
    if (v.kind === "pattern")
      return `<xs:restriction base="xs:string"><xs:pattern value="${x(v.value || "")}"/></xs:restriction>`;
    if (v.kind === "enumeration")
      return `<xs:restriction base="xs:string">${(v.values || []).map(val => `<xs:enumeration value="${x(val)}"/>`).join("")}</xs:restriction>`;
    if (v.kind === "range")
    {
      let s = '<xs:restriction base="xs:double">';
      if (v.min !== "" && v.min != null) s += `<xs:minInclusive value="${x(v.min)}"/>`;
      if (v.max !== "" && v.max != null) s += `<xs:maxInclusive value="${x(v.max)}"/>`;
      return s + "</xs:restriction>";
    }
    return "<ids:simpleValue></ids:simpleValue>";
  }

  // ─── File open / save actions ─────────────────────────────────────────────

  /** Reset to a blank IDS (no specs), clear the filename, and refresh the UI. */
  _newIdsAction()
  {
    this._ids = this._newIDS();
    this._selectedSpecIndex = -1;
    this._currentFileName = null;
    this.onShow();
    // Hide any previous mismatch banner when starting fresh
    if (this._warnBanner) this._warnBanner.style.display = "none";
  }

  /**
   * Open a native file picker for .ids/.xml files and load the selected file
   * into the editor.
   *
   * Mirrors ModelValidationPanel._importConfig():
   *   create input → read as text → delegate to _importContent()
   */
  _importFile()
  {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ids,.xml";
    input.addEventListener("change", () =>
    {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => this._importContent(e.target.result, file.name);
      reader.readAsText(file);
    });
    input.click();
  }

  /**
   * Parse and load IDS XML content into the editor, then refresh the UI.
   *
   * Mirrors ModelValidationPanel._importContent(): separated from the file
   * picker so it can also be called by external callers (e.g. drag-and-drop).
   * Silently returns if the XML cannot be parsed (loadFromXml returns false).
   *
   * @param {string} text     - raw XML string
   * @param {string} fileName - original file name (stored as the default save name)
   */
  _importContent(text, fileName)
  {
    if (!this.loadFromXml(fileName, text)) return; // parse failed — stay on current IDS
    this._currentFileName = fileName;              // remember for the Save dialog default
    this.onShow();                                 // re-render all tabs with the new data
    this._showModelWarnings();                     // highlight any model-mismatch issues
  }

  /**
   * Open a save dialog (filename field + cloud / local-download buttons).
   *
   * Mirrors ModelValidationPanel._saveToBimRocket() exactly:
   *
   *   • If onSave() callback is set (panel opened from FileExplorer via
   *     CreateIDSAction), the cloud button delegates to it — the action
   *     already knows the destination path.
   *   • If FileExplorer is open on a directory, save directly there.
   *   • Otherwise store a _pendingIDSSave stub and open the cloud explorer
   *     so the user can navigate to a folder (SaveIDSAction picks it up).
   *   • "Download locally" always triggers a browser file download.
   *
   * Note: Dialog.addButton() has no className param, so the primary style
   * must be applied manually on the returned element.
   */
  _saveAction()
  {
    const application  = this.application;
    const i18n         = application.i18n;

    // Prefer the FileExplorer that opened this panel (set by CreateIDSAction);
    // fall back to the global cloud_explorer tool if available.
    const fileExplorer = this._sourceFileExplorer ||
      application.tools["cloud_explorer"]?.fileExplorer || null;

    // "Save to server" button is highlighted when we already know a destination.
    const hasServerDest = typeof this.onSave === "function" ||
      fileExplorer?.isDirectoryList();

    // Pre-fill the filename: prefer the last opened/saved name, otherwise
    // derive it from the IDS title (stripping characters invalid in filenames).
    const defaultName = this._currentFileName ||
      ((this._ids.title || "ids").replace(/[^a-zA-Z0-9_\-]/g, "_") + ".ids");

    const dialog = new Dialog("ids.dialog.save_title");
    dialog.setSize(300, 175);
    dialog.setI18N(i18n);

    const nameElem = dialog.addTextField("ids_save_name", "ids.dialog.file_name");
    nameElem.setAttribute("spellcheck", "false");
    nameElem.value = defaultName;

    // Always ensure the filename ends with a recognised IDS extension.
    const getBaseName = () =>
    {
      const raw = nameElem.value.trim() || "ids.ids";
      return raw.endsWith(".ids") || raw.endsWith(".xml") ? raw : raw + ".ids";
    };

    // ── Local download ────────────────────────────────────────────────────────
    const saveLocal = baseName =>
    {
      const xml  = this._generateXML();
      const blob = new Blob([xml], { type: "application/xml" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = baseName;
      a.click();
      URL.revokeObjectURL(url);
    };

    // ── Cloud / server save ───────────────────────────────────────────────────
    const saveCloud = baseName =>
    {
      const xml = this._generateXML();
      if (typeof this.onSave === "function")
      {
        // Panel was opened from FileExplorer via CreateIDSAction — delegate back.
        this.onSave(baseName, xml);
      }
      else if (fileExplorer?.isDirectoryList())
      {
        // FileExplorer is already showing a directory — save there directly.
        fileExplorer.save(baseName, xml);
      }
      else
      {
        // No known destination: stash the pending save and send the user to
        // the cloud explorer; SaveIDSAction will pick it up on right-click.
        fileExplorer._pendingIDSSave = { baseName, content: xml };
        application.useTool(application.tools["cloud_explorer"]);
        Toast.create("ids.toast.navigate_to_save").setI18N(i18n).show();
      }
    };

    // ── Resolve destination path for the button label / tooltip ──────────────
    const saveTo   = i18n?.get("ids.btn.save_to");
    let   destPath = null;
    if (typeof this.onSave === "function" && fileExplorer?.service)
    {
      destPath = fileExplorer.getBasePathName();
    }
    else if (fileExplorer?.isDirectoryList())
    {
      destPath = fileExplorer.getBasePathName();
    }

    const cloudBtnLabel = destPath
      ? `${saveTo} ${destPath}`
      : i18n?.get("ids.btn.choose_folder");

    // ── Build dialog buttons ──────────────────────────────────────────────────

    // Cloud button: Dialog.addButton() does not accept a className param, so
    // we apply the primary style manually on the returned element.
    const cloudBtn = dialog.addButton("ids_save_cloud", cloudBtnLabel,
      () => { dialog.hide(); saveCloud(getBaseName()); });
    if (hasServerDest) cloudBtn.classList.add("ids_primary");
    // Prevent i18n.updateTree() from overwriting the dynamic label.
    delete cloudBtn.i18n;
    if (destPath) cloudBtn.title = `${saveTo} ${destPath}`;

    dialog.addButton("ids_save_local", "ids.btn.save_local",
      () => { dialog.hide(); saveLocal(getBaseName()); });

    dialog.addButton("ids_save_cancel", "button.cancel", () => dialog.hide());

    // Select the filename text when the dialog opens so the user can type immediately.
    dialog.onShow = () => { nameElem.select(); nameElem.focus(); };
    dialog.show();
  }

  /**
   * Load an IDS from XML string into the editor data model.
   * @param {string} fileName
   * @param {string} xmlString
   * @returns {boolean} true if parsed successfully
   */
  loadFromXml(fileName, xmlString)
  {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(xmlString, "text/xml");
    if (doc.querySelector("parsererror")) return false;

    const getTag = node =>
    {
      if (!node) return "";
      const t = node.tagName, i = t.indexOf(":");
      return i !== -1 ? t.substring(i + 1) : t;
    };

    const parseVal = node =>
    {
      if (!node) return { kind: "simpleValue", value: "" };
      const child = node.firstElementChild;
      if (!child) return { kind: "simpleValue", value: "" };
      const tag = getTag(child);
      if (tag === "simpleValue")
        return { kind: "simpleValue", value: child.textContent };
      if (tag === "restriction")
      {
        const entries = Array.from(child.children);
        const patterns = entries.filter(e => getTag(e) === "pattern");
        const enums    = entries.filter(e => getTag(e) === "enumeration");
        const minI     = entries.find(e => /minInclusive|minExclusive/.test(getTag(e)));
        const maxI     = entries.find(e => /maxInclusive|maxExclusive/.test(getTag(e)));
        if (enums.length)    return { kind: "enumeration", values: enums.map(e => e.getAttribute("value") || "") };
        if (patterns.length) return { kind: "pattern", value: patterns[0].getAttribute("value") || "" };
        if (minI || maxI)    return { kind: "range", min: minI?.getAttribute("value") || "", max: maxI?.getAttribute("value") || "" };
      }
      return { kind: "simpleValue", value: "" };
    };

    const ids  = this._newIDS();
    const info = doc.querySelector("info");
    if (info)
    {
      ids.title       = info.querySelector("title")?.textContent       || "";
      ids.version     = info.querySelector("version")?.textContent     || "";
      ids.author      = info.querySelector("author")?.textContent      || "";
      ids.date        = info.querySelector("date")?.textContent        || "";
      ids.milestone   = info.querySelector("milestone")?.textContent   || "";
      ids.copyright   = info.querySelector("copyright")?.textContent   || "";
      ids.purpose     = info.querySelector("purpose")?.textContent     || "";
      ids.description = info.querySelector("description")?.textContent || "";
    }

    const specsNode = doc.querySelector("specifications");
    if (specsNode)
    {
      for (const specNode of specsNode.children)
      {
        if (getTag(specNode) !== "specification") continue;
        const spec = this._newSpec();
        spec.name         = specNode.getAttribute("name")         || "";
        spec.identifier   = specNode.getAttribute("identifier")   || "";
        spec.description  = specNode.getAttribute("description")  || "";
        spec.instructions = specNode.getAttribute("instructions") || "";
        const ifcVer = specNode.getAttribute("ifcVersion") || "";
        spec.ifcVersions  = ifcVer ? ifcVer.split(" ").filter(Boolean) : ["IFC4"];

        const appNode = specNode.querySelector("applicability");
        if (appNode)
        {
          spec.applicability.minOccurs = parseInt(appNode.getAttribute("minOccurs") ?? "0");
          const mo = appNode.getAttribute("maxOccurs");
          spec.applicability.maxOccurs = (mo === "unbounded") ? null : parseInt(mo ?? "1");
          for (const fn of appNode.children)
          {
            const f = this._parseFacetNode(getTag(fn), fn, parseVal);
            if (f) spec.applicability.facets.push(f);
          }
          // Infer global cardinality from first facet (all share the same in this editor)
          if (spec.applicability.facets.length > 0)
            spec.applicability.cardinality = spec.applicability.facets[0].cardinality || "required";
        }
        const reqNode = specNode.querySelector("requirements");
        if (reqNode)
        {
          for (const fn of reqNode.children)
          {
            const f = this._parseFacetNode(getTag(fn), fn, parseVal);
            if (f) spec.requirements.facets.push(f);
          }
        }
        ids.specifications.push(spec);
      }
    }

    this._ids = ids;
    this._selectedSpecIndex = -1;
    this._currentFileName = fileName || null;
    return true;
  }

  /**
   * Parse a single facet XML element into a facet data object.
   * Called by loadFromXml() for every child of <ids:applicability>
   * and <ids:requirements>.
   *
   * Unknown facet types return null and are silently skipped.
   *
   * @param {string}   type      - facet type string (entity, property, …)
   * @param {Element}  node      - DOM element of the facet
   * @param {Function} parseVal  - fn(Element) → { kind, value/values/min/max }
   * @returns {Object|null} parsed facet or null for unknown types
   */
  _parseFacetNode(type, node, parseVal)
  {
    if (!["entity","partOf","classification","attribute","property","material"].includes(type))
      return null;
    const facet        = this._newFacet(type);
    facet.instructions = node.getAttribute("instructions") || "";
    facet.cardinality  = node.getAttribute("cardinality") || "required";

    switch (type)
    {
      case "entity":
        facet.name          = parseVal(node.querySelector("name"));
        facet.predefinedType = parseVal(node.querySelector("predefinedType"));
        break;
      case "partOf":
      {
        const en = node.querySelector("entity");
        if (en)
        {
          facet.entity.name          = parseVal(en.querySelector("name"));
          facet.entity.predefinedType = parseVal(en.querySelector("predefinedType"));
        }
        facet.relation = node.getAttribute("relation") || "";
        break;
      }
      case "classification":
        facet.value  = parseVal(node.querySelector("value"));
        facet.system = parseVal(node.querySelector("system"));
        facet.uri    = node.getAttribute("uri") || "";
        break;
      case "attribute":
        facet.name  = parseVal(node.querySelector("name"));
        facet.value = parseVal(node.querySelector("value"));
        break;
      case "property":
      {
        const pv = parseVal(node.querySelector("propertySet"));
        // Strip accidental "IFC_" prefix (old editor bug: stored userData key directly)
        if (pv?.kind === "simpleValue" && pv.value?.startsWith("IFC_"))
          pv.value = pv.value.substring(4);
        facet.propertySet = pv;
        facet.baseName    = parseVal(node.querySelector("baseName"));
        facet.value       = parseVal(node.querySelector("value"));
        facet.dataType    = node.getAttribute("dataType") || "";
        facet.uri         = node.getAttribute("uri")      || "";
        break;
      }
      case "material":
        facet.value = parseVal(node.querySelector("value"));
        facet.uri   = node.getAttribute("uri") || "";
        break;
    }
    return facet;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Open a read-only modal dialog showing the generated XML.
   * A "Copy to clipboard" button is provided for convenience.
   */
  _showXML()
  {
    const xml = this._generateXML();
    const dlg = new Dialog("ids.dialog.xml_title");
    dlg.setI18N(this.application.i18n);
    dlg.setSize(780, 540);

    const ta = document.createElement("textarea");
    ta.style.cssText = "width:100%;height:calc(100% - 44px);box-sizing:border-box;font-family:monospace;font-size:12px;resize:none;border:1px solid #ccc;padding:4px;";
    ta.readOnly = true;
    ta.value = xml;
    dlg.bodyElem.style.padding = "4px";
    dlg.bodyElem.appendChild(ta);

    Controls.addButton(dlg.footerElem, "copy", "ids.btn.copy_xml", () =>
    {
      navigator.clipboard?.writeText(xml).then(() =>
      {
        const prev = dlg.titleElem.textContent;
        dlg.titleElem.textContent = this.i18n ? this.i18n.get("ids.btn.copied") : "✓ Copied!";
        setTimeout(() => dlg.titleElem.textContent = prev, 1500);
      });
    });
    Controls.addButton(dlg.footerElem, "close", "button.close", () => dlg.hide());
    dlg.show();
    if (this.application.i18n) this.application.i18n.updateTree(dlg.dialogElem);
  }

  /**
   * Execute the current IDS against the loaded model using the Report tool.
   * Generates the XML, passes it to reportPanel.execute() and hides the editor.
   * Shows an alert if the Report tool is not available.
   */
  _run()
  {
    const application = this.application;

    // ReportPanel is created lazily by ReportAction and stored on the FileExplorer
    // that is associated with this session.  Check both the source explorer (set
    // by CreateIDSAction/EditIDSAction) and the global cloud_explorer fallback.
    const fileExplorer = this._sourceFileExplorer
      || application.tools["cloud_explorer"]?.fileExplorer
      || null;
    // Create the ReportPanel lazily if the FileExplorer hasn't done it yet
    // (e.g. when the IDS Editor is opened from the menu without visiting the explorer).
    let reportPanel = fileExplorer?.reportPanel || null;
    if (!reportPanel && fileExplorer)
    {
      fileExplorer.reportPanel = new ReportPanel(application);
      application.panelManager.addPanel(fileExplorer.reportPanel);
      reportPanel = fileExplorer.reportPanel;
    }

    if (!reportPanel)
    {
      const msg = this.i18n
        ? this.i18n.get("ids.run.error")
        : "The Report tool is not available. Open a model and activate the Report tool first.";
      alert(msg);
      return;
    }

    const xml  = this._generateXML();
    const name = (this._ids.title || "ids").replace(/[^a-zA-Z0-9_\-]/g, "_") + ".ids";
    reportPanel.execute(name, xml, "ids");
    this.visible = false;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Called every time the dialog becomes visible (show() on the base Dialog).
   * Resets the model cache so it is rebuilt from the current scene state,
   * then reloads all form fields from this._ids without rebuilding the DOM.
   */
  onShow()
  {
    // Reset model cache so it is rebuilt fresh from current scene on next access
    this._modelCache = null;

    const ids = this._ids;
    this._titleInput.value     = ids.title || "";
    this._versionInput.value   = ids.version || "";
    this._milestoneInput.value = ids.milestone || "";
    this._authorInput.value    = ids.author || "";
    this._dateInput.value      = ids.date || "";
    this._copyrightInput.value = ids.copyright || "";
    this._purposeInput.value   = ids.purpose || "";
    this._descInput.value      = ids.description || "";
    this._renderSpecList();
    this._showSpecEditor(false);
  }

  // ─── Generic helpers ──────────────────────────────────────────────────────

  /**
   * Append a flex row div (.ids_form_row) to `parent` and return it.
   * @param {boolean} grow - adds ids_form_row_grow so textareas can stretch vertically
   */
  _row(parent, grow)
  {
    const div = document.createElement("div");
    div.className = "ids_form_row" + (grow ? " ids_form_row_grow" : "");
    parent.appendChild(div);
    return div;
  }

  /**
   * Append a labelled text input (.ids_field) to `parent` and return the <input>.
   * @param {string} labelKey   - i18n key for the <label>
   * @param {string} extraClass - CSS class added to the wrapper div (ids_wide, etc.)
   * @param {string} type       - input type attribute (default "text")
   */
  _inp(parent, labelKey, extraClass, type)
  {
    const wrap = document.createElement("div");
    wrap.className = "ids_field " + (extraClass || "");
    parent.appendChild(wrap);

    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", labelKey);
    wrap.appendChild(lbl);
    if (this.i18n) this.i18n.update(lbl);

    const inp = document.createElement("input");
    inp.type = type || "text";
    wrap.appendChild(inp);
    return inp;
  }

  /**
   * Append a labelled textarea (.ids_field.ids_field_grow) to `parent` and return it.
   * @param {string} labelKey   - i18n key for the <label>
   * @param {string} extraClass - CSS class added to the wrapper div
   */
  _textarea(parent, labelKey, extraClass)
  {
    const wrap = document.createElement("div");
    wrap.className = "ids_field ids_field_grow " + (extraClass || "");
    parent.appendChild(wrap);

    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", labelKey);
    wrap.appendChild(lbl);
    if (this.i18n) this.i18n.update(lbl);

    const ta = document.createElement("textarea");
    ta.rows = 3;
    wrap.appendChild(ta);
    return ta;
  }

  /**
   * Append a small icon button to `parent` and return it.
   * Used for the spec list toolbar (+ − ↑ ↓).
   * @param {string}   icon     - button label text (symbol)
   * @param {string}   titleKey - i18n key for the tooltip
   * @param {Function} action   - click handler
   */
  _iconBtn(parent, icon, titleKey, action)
  {
    const btn = document.createElement("button");
    btn.className = "ids_icon_btn";
    btn.textContent = icon;
    I18N.set(btn, "title", titleKey);
    btn.addEventListener("click", action);
    parent.appendChild(btn);
    if (this.i18n) this.i18n.update(btn);
    return btn;
  }
}

export { IDSEditorDialog };
