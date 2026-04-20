/**
 * ModelValidationPanel.js
 *
 * Visual Model Validation panel: generates model validation views without
 * writing code. Supports filtering by IFC class, coloring by Pset/parameter,
 * controlling unaffected elements and showing a clickable legend.
 *
 * @author UPC
 */

import { Panel } from "./Panel.js";
import { Dialog } from "./Dialog.js";
import { Toast } from "./Toast.js";
import { I18N } from "../i18n/I18N.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { IFC } from "../io/ifc/IFC.js";
import * as THREE from "three";

// Paleta de colors per defecte
const COLOR_PALETTE = [
  "#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd",
  "#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf",
  "#393b79","#637939","#8c6d31","#843c39","#7b4173",
  "#3182bd","#31a354","#756bb1","#636363","#e6550d"
];

// Classes IFC excloses per defecte (mai es coloregen)
const DEFAULT_EXCLUDED = new Set([
  "IfcDistributionPort","IfcOpeningElement","IfcBuilding",
  "IfcBuildingStorey","IfcSite","IfcProject","IfcSpace"
]);


// Opcions especials del selector de Pset (virtuals, no psets del model)
const SPECIAL_PSETS = [
  ["__ifcClass__", "bim|mv.pset.ifc_class"],
  ["__ifcType__",  "bim|mv.pset.ifc_type"],
  ["__storey__",   "bim|mv.pset.storey"],
  ["__building__", "bim|mv.pset.building"],
  ["__site__",     "bim|mv.pset.site"],
  ["__system__",   "bim|mv.pset.system"],
  ["__zone__",     "bim|mv.pset.zone"],
  ["__group__",    "bim|mv.pset.group"],
];
const SPECIAL_PSET_VALUES = new Set(SPECIAL_PSETS.map(s => s[0]));

// Match modes que no necessiten un valor de text
const NO_VALUE_MODES = new Set(["has_param","no_param","has_value","no_value"]);

class ModelValidationPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "model_validation_panel";
    this.title = "bim|tool.model_validation.label";
    this.position = "left";
    this.minimumHeight = 200;

    // Estat intern
    this._modelClasses = [];          // empty until scanned
    this._modelPsets   = {};          // { psetName: [paramName, ...] }
    this._classPsets   = {};          // { ifcClassName: { psetName: [paramName, ...] } }
    this._valueColorMap = {};
    this._applied = false;
    this._rules   = [];               // active filter rules

    this._pendingSave = null;         // { content, name } for save-to-programes

    // Legend panel — registered in PanelManager, shown when validation is applied
    this._legendPanel = new Panel(application);
    this._legendPanel.title = "bim|mv.legend.title";
    this._legendPanel.position = "right";
    this._legendPanel.minimumHeight = 100;
    this._legendPanel.onClose = () =>
    {
      this._legendPanel.visible = false;
      return false;
    };
    application.panelManager.addPanel(this._legendPanel);

    this._buildUI();
    this._renderClassList();          // show empty placeholder

    application.addEventListener("scene", event =>
    {
      if (event.type === "added")
      {
        let hasIFC = false;
        application.baseObject?.traverse(obj =>
        {
          if (obj.userData?.IFC?.ifcClassName) hasIFC = true;
        });
        if (hasIFC) { this._scanModel(); return; }
      }
      if (this._modelClasses.length === 0) this._renderClassList();
    });
  }

  // ─── UI construction ────────────────────────────────────────────────────

  _buildUI()
  {
    const body = this.bodyElem;
    body.classList.add("mv_panel");

    // ── Hidden IFC class filter (auto-scanned; elements needed by internal logic)
    const classContainer = document.createElement("div");
    classContainer.style.display = "none";
    body.appendChild(classContainer);
    const scanRow = document.createElement("div");
    classContainer.appendChild(scanRow);
    this._scanBtn = document.createElement("button");
    scanRow.appendChild(this._scanBtn);
    this._scanBtn.addEventListener("click", () => this._scanModel());
    this.classListElem = document.createElement("div");
    this.classListElem.className = "mv_class_list";
    classContainer.appendChild(this.classListElem);

    // ── Mode selector (Colorar / Filtrar) — always visible at top
    const modeRow = this._row(body);
    modeRow.className += " mv_mode_row";
    this._modeColorBtn = document.createElement("button");
    this._modeColorBtn.className = "mv_btn mv_mode_btn mv_mode_active";
    I18N.set(this._modeColorBtn, "textContent", "bim|mv.mode.color");
    this._modeColorBtn.addEventListener("click", () => this._setMode("color"));
    modeRow.appendChild(this._modeColorBtn);
    this._modeFilterBtn = document.createElement("button");
    this._modeFilterBtn.className = "mv_btn mv_mode_btn";
    I18N.set(this._modeFilterBtn, "textContent", "bim|mv.mode.filter");
    this._modeFilterBtn.addEventListener("click", () => this._setMode("filter"));
    modeRow.appendChild(this._modeFilterBtn);
    this._modeValue = "color";

    // ── Main content area (grows to fill panel space between mode row and footer)
    const contentArea = document.createElement("div");
    contentArea.className = "mv_content_area";
    body.appendChild(contentArea);

    // ─ Color section (group by property) ─
    this._groupBySection = document.createElement("div");
    const psetRow = this._labeledRow(this._groupBySection, "bim|mv.label.pset");
    this.psetSelect = document.createElement("select");
    this.psetSelect.className = "mv_select";
    psetRow.appendChild(this.psetSelect);
    this.psetSelect.addEventListener("change", () => this._onPsetChange());

    const paramRow = this._labeledRow(this._groupBySection, "bim|mv.label.param");
    this.paramSelect = document.createElement("select");
    this.paramSelect.className = "mv_select";
    paramRow.appendChild(this.paramSelect);
    this._paramRow = paramRow;

    const lgHeader = document.createElement("div");
    lgHeader.className = "mv_rule2_header";
    I18N.set(lgHeader, "textContent", "bim|mv.label.legend_group");
    this._groupBySection.appendChild(lgHeader);
    const lgSelRow = document.createElement("div");
    lgSelRow.className = "mv_rule_row_top";
    lgSelRow.style.padding = "2px 8px 6px";
    this.lgPsetSelect = document.createElement("select");
    this.lgPsetSelect.className = "mv_select";
    this.lgParamSelect = document.createElement("select");
    this.lgParamSelect.className = "mv_select";
    lgSelRow.appendChild(this.lgPsetSelect);
    lgSelRow.appendChild(this.lgParamSelect);
    this._groupBySection.appendChild(lgSelRow);
    this.lgPsetSelect.addEventListener("change", () => this._onLgPsetChange());
    contentArea.appendChild(this._groupBySection);

    // ─ Filter section (rules) ─
    this._filterSection = document.createElement("div");
    this._filterSection.className = "mv_filter_section";
    this._filterSection.style.display = "none";
    const opAddRow = document.createElement("div");
    opAddRow.className = "mv_row";
    this.ruleOpSelect = document.createElement("select");
    this.ruleOpSelect.className = "mv_select mv_rule_op";
    [["AND","bim|mv.rule.and"],["OR","bim|mv.rule.or"]].forEach(([val,key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      this.ruleOpSelect.appendChild(opt);
    });
    this.ruleOpSelect.addEventListener("change", () => this._refreshSeparators());
    opAddRow.appendChild(this.ruleOpSelect);
    // "Add Rule" (flat, backward-compat — hidden) + "Add Stylization" (tree editor, now primary)
    const addRuleBtn = this._btn(opAddRow, "bim|mv.btn.add_rule", () => this._addRule(), "mv_primary");
    if (addRuleBtn) addRuleBtn.style.display = "none";
    this._btn(opAddRow, "bim|mv.btn.add_stylization", () => this._addStylization(), "mv_primary");
    this._filterSection.appendChild(opAddRow);

    this._rulesContainer = document.createElement("div");
    this._rulesContainer.className = "mv_rules_container";
    this._filterSection.appendChild(this._rulesContainer);
    contentArea.appendChild(this._filterSection);

    // Initialize psets
    this._populatePsetDefaults();

    // ── Others mode (always visible, below content area)
    const othersRow = this._labeledRow(body, "bim|mv.label.others_mode");
    othersRow.className += " mv_others_row";
    this.othersSelect = document.createElement("select");
    this.othersSelect.className = "mv_select";
    [
      ["normal",      "bim|mv.others.normal"],
      ["transparent", "bim|mv.others.transparent"],
      ["hidden",      "bim|mv.others.hidden"]
    ].forEach(([val,key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      this.othersSelect.appendChild(opt);
    });
    this.othersSelect.value = "normal";
    othersRow.appendChild(this.othersSelect);

    // ── Action buttons
    const footer = document.createElement("div");
    footer.className = "mv_footer";
    body.appendChild(footer);

    const leftBtns = document.createElement("div");
    leftBtns.className = "mv_footer_left";
    footer.appendChild(leftBtns);
    this._btn(leftBtns, "bim|mv.btn.save", () => this._executeSave("bimrocket"));
    this._btn(leftBtns, "bim|mv.btn.open", () => this._importConfig());

    const rightBtns = document.createElement("div");
    rightBtns.className = "mv_footer_right";
    footer.appendChild(rightBtns);
    this._btn(rightBtns, "bim|mv.btn.apply", () => this._apply(), "mv_primary");
    this._btn(rightBtns, "bim|mv.btn.reset", () => this._reset(), "mv_danger");
  }

  // ─── Helpers UI ─────────────────────────────────────────────────────────

  _section(parent, i18nKey, builder, open = false)
  {
    const wrap = document.createElement("div");
    wrap.className = "mv_section";
    if (!open) wrap.classList.add("mv_collapsed");

    const h = document.createElement("div");
    h.className = "mv_section_title";
    I18N.set(h, "textContent", i18nKey);
    h.addEventListener("click", () => this._toggleSection(wrap));
    wrap.appendChild(h);

    const body = document.createElement("div");
    body.className = "mv_section_body";
    builder(body);
    wrap.appendChild(body);

    parent.appendChild(wrap);
    return wrap;
  }

  _toggleSection(section)
  {
    const willOpen = section.classList.contains("mv_collapsed");
    if (willOpen)
    {
      section.parentElement.querySelectorAll(".mv_section")
        .forEach(s => s.classList.add("mv_collapsed"));
    }
    section.classList.toggle("mv_collapsed", !willOpen);
  }

  _row(parent)
  {
    const d = document.createElement("div");
    d.className = "mv_row";
    parent.appendChild(d);
    return d;
  }

  _labeledRow(parent, i18nKey)
  {
    const d = document.createElement("div");
    d.className = "mv_labeled_row";
    const lbl = document.createElement("label");
    lbl.className = "mv_label";
    I18N.set(lbl, "textContent", i18nKey);
    d.appendChild(lbl);
    parent.appendChild(d);
    return d;
  }

  _btn(parent, i18nKey, cb, cls = "")
  {
    const b = document.createElement("button");
    b.className = "mv_btn " + cls;
    I18N.set(b, "textContent", i18nKey);
    b.addEventListener("click", cb);
    parent.appendChild(b);
    return b;
  }

  _checkbox(parent, i18nKey, checked = true)
  {
    const row = document.createElement("div");
    row.className = "mv_check_row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = checked;
    const lbl = document.createElement("label");
    I18N.set(lbl, "textContent", i18nKey);
    row.appendChild(cb);
    row.appendChild(lbl);
    parent.appendChild(row);
    return cb;
  }

  // ─── Escaneig del model ──────────────────────────────────────────────────

  _ensureScanned()
  {
    if (Object.keys(this._modelPsets).length === 0 && this.application.baseObject)
      this._scanModel();
  }

  /**
   * Scan the model for IFC classes and property sets.
   * Populates _modelClasses, _modelPsets, and _classPsets for UI dropdowns.
   */
  _scanModel()
  {
    const app = this.application;
    if (!app.baseObject) return;

    const classSet  = new Set();
    const psetMap   = {};           // global: pset → Set<param>
    const classPsets = {};          // per-class: cls → { pset → Set<param> }

    app.baseObject.traverse(obj =>
    {
      const ud = obj.userData;
      if (!ud || !ud.IFC) return;
      const cls = ud.IFC.ifcClassName;
      if (!cls || DEFAULT_EXCLUDED.has(cls)) return;
      const isElement = Object.values(IFC.SCHEMAS).some(
        schema => schema[cls]?.prototype instanceof schema.IfcElement);
      if (!isElement) return;

      classSet.add(cls);
      if (!classPsets[cls]) classPsets[cls] = {};

      const uds = [ud];
      const typeUd = obj.links?.ifcType?.userData;
      if (typeUd) uds.push(typeUd);

      for (const src of uds)
      {
        for (const pset in src)
        {
          if (pset === "IFC" || typeof src[pset] !== "object") continue;
          if (!psetMap[pset]) psetMap[pset] = new Set();
          if (!classPsets[cls][pset]) classPsets[cls][pset] = new Set();
          for (const param in src[pset])
          {
            if (!param.endsWith("_metadata"))
            {
              psetMap[pset].add(param);
              classPsets[cls][pset].add(param);
            }
          }
        }
      }
    });

    this._modelClasses = Array.from(classSet).sort();
    this._modelPsets   = {};
    for (const p in psetMap) this._modelPsets[p] = Array.from(psetMap[p]).sort();
    this._classPsets   = {};
    for (const cls in classPsets)
    {
      this._classPsets[cls] = {};
      for (const p in classPsets[cls])
        this._classPsets[cls][p] = Array.from(classPsets[cls][p]).sort();
    }

    this._renderClassList();
    this._populatePsets();
  }

  _renderClassList()
  {
    this.classListElem.innerHTML = "";
    this._updateScanBtn();

    if (this._modelClasses.length === 0)
    {
      const ph = document.createElement("div");
      ph.className = "mv_placeholder_hint";
      const hasModel = this.application.baseObject?.children?.length > 0;
      I18N.set(ph, "textContent",
        hasModel ? "bim|mv.placeholder.no_scan" : "bim|mv.placeholder.no_model");
      this.classListElem.appendChild(ph);
      this.application.i18n?.update(ph);
      return;
    }

    this._modelClasses.forEach(cls =>
    {
      const row = document.createElement("div");
      row.className = "mv_class_row";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.dataset.cls = cls;
      cb.addEventListener("change", () => this._onClassFilterChange());
      const lbl = document.createElement("label");
      lbl.textContent = cls;
      row.appendChild(cb);
      row.appendChild(lbl);
      this.classListElem.appendChild(row);
    });
  }

  _toggleAllClasses(state)
  {
    this.classListElem.querySelectorAll("input[type=checkbox]")
      .forEach(cb => { cb.checked = state; });
    this._onClassFilterChange();
  }

  // Called whenever the IFC class selection changes.
  // Refreshes all PSets dropdowns to show only PSets relevant to the selected classes.
  _onClassFilterChange()
  {
    this._populatePsets();
  }

  _getSelectedClasses()
  {
    const selected = [];
    this.classListElem.querySelectorAll("input[data-cls]:checked")
      .forEach(cb => selected.push(cb.dataset.cls));
    return selected;
  }

  // ─── Psets and parameters ──────────────────────────────────────────────────

  _populatePsetDefaults()
  {
    this._fillPsetSelect(this.psetSelect);
    this._onPsetChange();
    this._fillLgPsetSelect();
    this._onLgPsetChange();
  }

  _populatePsets()
  {
    const prev = this.psetSelect.value;
    this._fillPsetSelect(this.psetSelect);
    if (prev && [...this.psetSelect.options].some(o => o.value === prev))
      this.psetSelect.value = prev;
    this._onPsetChange();
    if (this.application.i18n) this.application.i18n.updateTree(this.psetSelect);
    this._rules.forEach(rule => this._refreshRulePset(rule));
    this._fillLgPsetSelect();
    this._onLgPsetChange();
  }

  _fillPsetSelect(sel)
  {
    sel.innerHTML = "";

    // Optgroup: espacial / projecte
    const spatialGroup = document.createElement("optgroup");
    I18N.set(spatialGroup, "label", "bim|mv.optgroup.spatial");
    SPECIAL_PSETS.forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      spatialGroup.appendChild(opt);
    });
    sel.appendChild(spatialGroup);

    // Optgroup: property sets del model (filtered by selected IFC classes)
    const allPsets = this._modelPsets;
    if (Object.keys(allPsets).length > 0)
    {
      // Compute the set of PSets relevant to the currently selected classes.
      // If no class filter is active (all checked or none checked), show all PSets.
      const selectedClasses = this._getSelectedClasses();
      const totalClasses = this._modelClasses.length;
      const allSelected = selectedClasses.length === 0 || selectedClasses.length === totalClasses;

      let visiblePsets;
      if (allSelected || Object.keys(this._classPsets).length === 0)
      {
        // No filter — show every pset
        visiblePsets = Object.keys(allPsets).sort();
      }
      else
      {
        // Collect only PSets that belong to at least one selected class
        const psetSet = new Set();
        for (const cls of selectedClasses)
        {
          const cp = this._classPsets[cls];
          if (cp) for (const p of Object.keys(cp)) psetSet.add(p);
        }
        visiblePsets = Array.from(psetSet).sort();
      }

      if (visiblePsets.length > 0)
      {
        const psetGroup = document.createElement("optgroup");
        I18N.set(psetGroup, "label", "bim|mv.optgroup.psets");
        visiblePsets.forEach(pset =>
        {
          const opt = document.createElement("option");
          opt.value = pset;
          opt.textContent = pset;
          psetGroup.appendChild(opt);
        });
        sel.appendChild(psetGroup);
      }
    }
  }

  _fillLgPsetSelect()
  {
    const prev = this.lgPsetSelect.value;
    this.lgPsetSelect.innerHTML = "";
    const none = document.createElement("option");
    none.value = "__none__";
    I18N.set(none, "textContent", "bim|mv.legend_group.none");
    this.lgPsetSelect.appendChild(none);

    const spatialGroup = document.createElement("optgroup");
    I18N.set(spatialGroup, "label", "bim|mv.optgroup.spatial");
    SPECIAL_PSETS.forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      spatialGroup.appendChild(opt);
    });
    this.lgPsetSelect.appendChild(spatialGroup);

    if (Object.keys(this._modelPsets).length > 0)
    {
      const selectedClasses = this._getSelectedClasses();
      const totalClasses = this._modelClasses.length;
      const allSelected = selectedClasses.length === 0 || selectedClasses.length === totalClasses;

      let visiblePsets;
      if (allSelected || Object.keys(this._classPsets).length === 0)
      {
        visiblePsets = Object.keys(this._modelPsets).sort();
      }
      else
      {
        const psetSet = new Set();
        for (const cls of selectedClasses)
        {
          const cp = this._classPsets[cls];
          if (cp) for (const p of Object.keys(cp)) psetSet.add(p);
        }
        visiblePsets = Array.from(psetSet).sort();
      }

      if (visiblePsets.length > 0)
      {
        const psetGroup = document.createElement("optgroup");
        I18N.set(psetGroup, "label", "bim|mv.optgroup.psets");
        visiblePsets.forEach(pset =>
        {
          const opt = document.createElement("option");
          opt.value = pset;
          opt.textContent = pset;
          psetGroup.appendChild(opt);
        });
        this.lgPsetSelect.appendChild(psetGroup);
      }
    }

    if (prev && [...this.lgPsetSelect.options].some(o => o.value === prev))
      this.lgPsetSelect.value = prev;
    this.application.i18n?.updateTree(this.lgPsetSelect);
  }

  _onLgPsetChange()
  {
    const pset = this.lgPsetSelect.value;
    this.lgParamSelect.innerHTML = "";
    const isModelPset = pset !== "__none__" && !SPECIAL_PSET_VALUES.has(pset);
    this.lgParamSelect.style.display = isModelPset ? "" : "none";
    if (!isModelPset) return;
    (this._modelPsets[pset] || []).forEach(p =>
    {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      this.lgParamSelect.appendChild(opt);
    });
  }

  _refreshSeparators()
  {
    const op = this.ruleOpSelect.value;
    this._rulesContainer.querySelectorAll(".mv_op_sep").forEach(el => el.remove());
    // Select both flat rules (.mv_rule_row) and tree stylizations (.mv_styl_block)
    [...this._rulesContainer.querySelectorAll(".mv_rule_row, .mv_styl_block")].forEach((row, i) =>
    {
      if (i === 0) return;
      const sep = document.createElement("div");
      sep.className = "mv_op_sep";
      sep.textContent = op;
      this._rulesContainer.insertBefore(sep, row);
    });
  }

  // ─── Regles de filtre (amb entrades per valor) ───────────────────────────

  _addRule(data = {})
  {
    const rule = { entries: [] };
    const row = document.createElement("div");
    row.className = "mv_rule_row";

    // Rule header: pset + param + delete button
    const top = document.createElement("div");
    top.className = "mv_rule_row_top";

    rule.psetSelect = document.createElement("select");
    rule.psetSelect.className = "mv_select";
    this._fillPsetSelect(rule.psetSelect);
    rule.psetSelect.addEventListener("change", () => this._onRulePsetChange(rule));
    top.appendChild(rule.psetSelect);

    rule.paramSelect = document.createElement("select");
    rule.paramSelect.className = "mv_select";
    top.appendChild(rule.paramSelect);

    const moveUp = document.createElement("button");
    moveUp.className = "mv_btn mv_rule_del";
    I18N.set(moveUp, "title", "bim|mv.rule.move_up");
    moveUp.textContent = "↑";
    moveUp.addEventListener("click", () => this._moveRule(rule, -1));
    top.appendChild(moveUp);

    const moveDown = document.createElement("button");
    moveDown.className = "mv_btn mv_rule_del";
    I18N.set(moveDown, "title", "bim|mv.rule.move_down");
    moveDown.textContent = "↓";
    moveDown.addEventListener("click", () => this._moveRule(rule, +1));
    top.appendChild(moveDown);

    const del = document.createElement("button");
    del.className = "mv_btn mv_danger mv_rule_del";
    del.textContent = "✕";
    del.addEventListener("click", () => this._removeRule(rule));
    top.appendChild(del);

    row.appendChild(top);

    // Contenidor d'entrades (condicions + color + override)
    rule.entriesContainer = document.createElement("div");
    rule.entriesContainer.className = "mv_rule_entries";
    row.appendChild(rule.entriesContainer);

    // Add value button
    const addEntryRow = document.createElement("div");
    addEntryRow.className = "mv_rule_add_entry_row";
    const addEntryBtn = document.createElement("button");
    addEntryBtn.className = "mv_btn";
    I18N.set(addEntryBtn, "textContent", "bim|mv.btn.add_value");
    addEntryBtn.addEventListener("click", () =>
    {
      this._addEntry(rule, {});
      this.application.i18n?.updateTree(rule.entriesContainer);
    });
    addEntryRow.appendChild(addEntryBtn);
    row.appendChild(addEntryRow);

    rule.elem = row;
    this._rules.push(rule);
    this._rulesContainer.appendChild(row);
    this._refreshSeparators();
    this._onRulePsetChange(rule);

    // Restaurar dades guardades
    if (data.pset && [...rule.psetSelect.options].some(o => o.value === data.pset))
    {
      rule.psetSelect.value = data.pset;
      this._onRulePsetChange(rule);
    }
    if (data.param && [...rule.paramSelect.options].some(o => o.value === data.param))
      rule.paramSelect.value = data.param;

    // Afegir entrades
    const entries = data.entries || (data.value ? [{ match: data.match || "exact", value: data.value }] : [{}]);
    entries.forEach(e => this._addEntry(rule, e));

    this.application.i18n?.updateTree(row);
    return rule;
  }

  _addEntry(rule, data = {})
  {
    const entryData = {};
    const entryRow = document.createElement("div");
    entryRow.className = "mv_rule_entry";

    // Fila 2: selecció del valor (op + match mode + value input + delete)
    const valueRow = document.createElement("div");
    valueRow.className = "mv_entry_row_value";

    // Op: sempre creem label + select; _refreshEntryOps gestiona la visibilitat
    entryData.opLabel = document.createElement("span");
    entryData.opLabel.className = "mv_entry_op_label";
    I18N.set(entryData.opLabel, "textContent", "bim|mv.entry.op_if");
    valueRow.appendChild(entryData.opLabel);

    entryData.opSelect = document.createElement("select");
    entryData.opSelect.className = "mv_select mv_entry_op_sel";
    [
      ["OR",  "bim|mv.rule.or"],
      ["AND", "bim|mv.rule.and"],
      ["NOT", "bim|mv.rule.not"],
    ].forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      entryData.opSelect.appendChild(opt);
    });
    if (data.op) entryData.opSelect.value = data.op;
    valueRow.appendChild(entryData.opSelect);

    entryData.matchSelect = this._matchModeSelect();
    valueRow.appendChild(entryData.matchSelect);

    entryData.valueInput = document.createElement("input");
    entryData.valueInput.type = "text";
    entryData.valueInput.className = "mv_input mv_entry_value";
    I18N.set(entryData.valueInput, "placeholder", "bim|mv.placeholder.value_filter");
    valueRow.appendChild(entryData.valueInput);

    const moveUp = document.createElement("button");
    moveUp.className = "mv_btn mv_entry_move";
    moveUp.textContent = "↑";
    moveUp.addEventListener("click", () => this._moveEntry(rule, entryData, -1));
    valueRow.appendChild(moveUp);

    const moveDown = document.createElement("button");
    moveDown.className = "mv_btn mv_entry_move";
    moveDown.textContent = "↓";
    moveDown.addEventListener("click", () => this._moveEntry(rule, entryData, +1));
    valueRow.appendChild(moveDown);

    const delEntry = document.createElement("button");
    delEntry.className = "mv_btn mv_danger mv_entry_del";
    delEntry.textContent = "✕";
    delEntry.addEventListener("click", () =>
    {
      rule.entries = rule.entries.filter(e => e !== entryData);
      entryRow.remove();
      this._refreshEntryOps(rule);
    });
    valueRow.appendChild(delEntry);

    entryRow.appendChild(valueRow);

    // Fila 3: acció a aplicar (action + color + opacity)
    const actionRow = document.createElement("div");
    actionRow.className = "mv_entry_row_action";

    // Action select: Show / Hide / Color / Transparent
    entryData.actionSelect = document.createElement("select");
    entryData.actionSelect.className = "mv_select mv_action_sel";
    [
      ["show",        "bim|mv.action.show"],
      ["hide",        "bim|mv.action.hide"],
      ["color",       "bim|mv.action.color"],
      ["transparent", "bim|mv.action.transparent"],
    ].forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      entryData.actionSelect.appendChild(opt);
    });
    actionRow.appendChild(entryData.actionSelect);

    // Color input (visible only when action === "color")
    entryData.colorInput = document.createElement("input");
    entryData.colorInput.type = "color";
    entryData.colorInput.className = "mv_color_input";
    entryData.colorInput.value = data.color || COLOR_PALETTE[rule.entries.length % COLOR_PALETTE.length];
    actionRow.appendChild(entryData.colorInput);

    // Opacity container (visible only when action === "transparent")
    entryData.opacityContainer = document.createElement("span");
    entryData.opacityContainer.className = "mv_opacity_container";

    entryData.opacityModeSelect = document.createElement("select");
    entryData.opacityModeSelect.className = "mv_select mv_opacity_mode_sel";
    [
      ["fixed",    "bim|mv.opacity.fixed"],
      ["property", "bim|mv.opacity.property"],
    ].forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      entryData.opacityModeSelect.appendChild(opt);
    });
    entryData.opacityContainer.appendChild(entryData.opacityModeSelect);

    entryData.opacityInput = document.createElement("input");
    entryData.opacityInput.type = "number";
    entryData.opacityInput.min = "0";
    entryData.opacityInput.max = "1";
    entryData.opacityInput.step = "0.05";
    entryData.opacityInput.className = "mv_input mv_opacity_input";
    entryData.opacityInput.value = data.opacity ?? 0.3;
    entryData.opacityContainer.appendChild(entryData.opacityInput);

    entryData.opacityPsetInput = document.createElement("input");
    entryData.opacityPsetInput.type = "text";
    entryData.opacityPsetInput.className = "mv_input mv_opacity_pset";
    I18N.set(entryData.opacityPsetInput, "placeholder", "bim|mv.placeholder.pset");
    entryData.opacityContainer.appendChild(entryData.opacityPsetInput);

    entryData.opacityParamInput = document.createElement("input");
    entryData.opacityParamInput.type = "text";
    entryData.opacityParamInput.className = "mv_input mv_opacity_param";
    I18N.set(entryData.opacityParamInput, "placeholder", "bim|mv.placeholder.param");
    entryData.opacityContainer.appendChild(entryData.opacityParamInput);

    actionRow.appendChild(entryData.opacityContainer);
    entryRow.appendChild(actionRow);

    // Restaurar dades
    if (data.match) entryData.matchSelect.value = data.match;
    if (data.value) entryData.valueInput.value = data.value;
    entryData.actionSelect.value = data.action || this._overrideToAction(data.override);
    if (data.opacityMode) entryData.opacityModeSelect.value = data.opacityMode;
    if (data.opacity !== undefined) entryData.opacityInput.value = data.opacity;
    if (data.opacityPset) entryData.opacityPsetInput.value = data.opacityPset;
    if (data.opacityParam) entryData.opacityParamInput.value = data.opacityParam;

    this._updateEntryValueVisibility(entryData);
    this._updateEntryActionVisibility(entryData);
    entryData.matchSelect.addEventListener("change", () => this._updateEntryValueVisibility(entryData));
    entryData.actionSelect.addEventListener("change", () => this._updateEntryActionVisibility(entryData));
    entryData.opacityModeSelect.addEventListener("change", () => this._updateEntryOpacityModeVisibility(entryData));

    entryData.elem = entryRow;
    rule.entries.push(entryData);
    rule.entriesContainer.appendChild(entryRow);
    this._refreshEntryOps(rule);
    return entryData;
  }

  _updateEntryValueVisibility(entryData)
  {
    const noVal = NO_VALUE_MODES.has(entryData.matchSelect.value);
    entryData.valueInput.style.display = noVal ? "none" : "";
    entryData.valueInput.style.visibility = noVal ? "hidden" : "";
  }

  _overrideToAction(override)
  {
    switch (override)
    {
      case "hidden":      return "hide";
      case "transparent": return "transparent";
      default:            return "color";
    }
  }

  _entryAppearance(entry)
  {
    return {
      action:      entry.action,
      color:       entry.color,
      opacityMode: entry.opacityMode,
      opacity:     entry.opacity,
      opacityPset: entry.opacityPset,
      opacityParam: entry.opacityParam,
      mode:        entry.mode,
      value:       entry.value,
    };
  }

  _updateEntryActionVisibility(entryData)
  {
    const action = entryData.actionSelect.value;
    entryData.colorInput.style.display = action === "color" ? "" : "none";
    entryData.opacityContainer.style.display = action === "transparent" ? "" : "none";
    if (action === "transparent") this._updateEntryOpacityModeVisibility(entryData);
  }

  _updateEntryOpacityModeVisibility(entryData)
  {
    const isFixed = entryData.opacityModeSelect.value === "fixed";
    entryData.opacityInput.style.display = isFixed ? "" : "none";
    entryData.opacityPsetInput.style.display = isFixed ? "none" : "";
    entryData.opacityParamInput.style.display = isFixed ? "none" : "";
  }

  _refreshEntryOps(rule)
  {
    rule.entries.forEach((e, i) =>
    {
      e.opLabel.style.display  = i === 0 ? "" : "none";
      e.opSelect.style.display = i === 0 ? "none" : "";
    });
  }

  _moveEntry(rule, entryData, direction)
  {
    const idx = rule.entries.indexOf(entryData);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= rule.entries.length) return;
    [rule.entries[idx], rule.entries[newIdx]] = [rule.entries[newIdx], rule.entries[idx]];
    rule.entriesContainer.innerHTML = "";
    rule.entries.forEach(e => rule.entriesContainer.appendChild(e.elem));
    this._refreshEntryOps(rule);
  }

  _removeRule(rule)
  {
    this._rules = this._rules.filter(r => r !== rule);
    rule.elem.remove();
    this._refreshSeparators();
  }

  _moveRule(rule, direction)
  {
    const idx = this._rules.indexOf(rule);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this._rules.length) return;
    [this._rules[idx], this._rules[newIdx]] = [this._rules[newIdx], this._rules[idx]];
    this._rulesContainer.innerHTML = "";
    this._rules.forEach(r => this._rulesContainer.appendChild(r.elem));
    this._refreshSeparators();
  }

  // ─── Phase 3: Tree-based Stylization Editor ─────────────────────────────────
  //
  // A "stylization" is an IF <condition-tree> THEN <style> block.
  // The condition tree is an ExprNode (AND/OR/NOT/LEAF) built with _loadTreeNode().
  // Unlike flat rules (_addRule), each LEAF inside the tree has its own pset/param.
  //
  // Backward-compat: flat rules (_addRule) continue to work unchanged.
  // _loadConfig() detects new format by presence of `condition` key.
  // _currentConfig() saves { condition, style } for tree rules.

  /**
   * Add a tree-based IF/THEN stylization block to the filter section.
   * @param {Object} data - optional { condition: ExprNode, style: { action, color, ... } }
   * @returns {Object} rule object added to this._rules
   */
  _addStylization(data = {})
  {
    const rule = { _format: "tree", entries: [] }; // entries:[] for backward-compat paths

    const block = document.createElement("div");
    block.className = "mv_styl_block";

    // ── Name input ─────────────────────────────────────────────────────────────
    const nameRow = document.createElement("div");
    nameRow.className = "mv_styl_name_row";
    rule.nameInput = document.createElement("input");
    rule.nameInput.type = "text";
    rule.nameInput.className = "mv_input mv_styl_name_input";
    I18N.set(rule.nameInput, "placeholder", "bim|mv.placeholder.rule_name");
    if (data.name) rule.nameInput.value = data.name;
    nameRow.appendChild(rule.nameInput);
    block.appendChild(nameRow);

    // ── Move / delete buttons (will be placed in root combinator header) ──────
    const moveUp = document.createElement("button");
    moveUp.className = "mv_btn mv_rule_del";
    moveUp.textContent = "↑";
    I18N.set(moveUp, "title", "bim|mv.rule.move_up");
    moveUp.addEventListener("click", () => this._moveRule(rule, -1));

    const moveDown = document.createElement("button");
    moveDown.className = "mv_btn mv_rule_del";
    moveDown.textContent = "↓";
    I18N.set(moveDown, "title", "bim|mv.rule.move_down");
    moveDown.addEventListener("click", () => this._moveRule(rule, +1));

    const del = document.createElement("button");
    del.className = "mv_btn mv_danger mv_rule_del";
    del.textContent = "✕";
    del.addEventListener("click", () => this._removeRule(rule));

    // ── Condition tree ──────────────────────────────────────────────────────
    const treeContainer = document.createElement("div");
    treeContainer.className = "mv_tree_container";
    block.appendChild(treeContainer);

    // Default: AND node with one empty LEAF child
    const initCondition = data.condition || {
      type: "AND",
      args: [{ type: "LEAF", pset: "__ifcClass__", param: "", mode: "exact", value: "" }]
    };
    rule.conditionNode = this._loadTreeNode(rule, initCondition, null, treeContainer, 0, [moveUp, moveDown, del]);

    // ── THEN row (style: action + color + opacity) ─────────────────────────
    const thenRow = document.createElement("div");
    thenRow.className = "mv_styl_then_row";

    const thenLabel = document.createElement("span");
    thenLabel.className = "mv_styl_section_label mv_styl_then_label";
    I18N.set(thenLabel, "textContent", "bim|mv.styl.then");
    thenRow.appendChild(thenLabel);

    const initStyle = data.style || {};

    // Action select (show / hide / color / transparent)
    rule.actionSelect = document.createElement("select");
    rule.actionSelect.className = "mv_select mv_action_sel";
    [
      ["color",       "bim|mv.action.color"],
      ["show",        "bim|mv.action.show"],
      ["hide",        "bim|mv.action.hide"],
      ["transparent", "bim|mv.action.transparent"],
    ].forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      rule.actionSelect.appendChild(opt);
    });
    if (initStyle.action) rule.actionSelect.value = initStyle.action;
    thenRow.appendChild(rule.actionSelect);

    // Color input (visible when action = "color")
    rule.colorInput = document.createElement("input");
    rule.colorInput.type = "color";
    rule.colorInput.className = "mv_color_input";
    rule.colorInput.value = initStyle.color || COLOR_PALETTE[this._rules.length % COLOR_PALETTE.length];
    thenRow.appendChild(rule.colorInput);

    // Opacity container (visible when action = "transparent")
    rule.opacityContainer = document.createElement("span");
    rule.opacityContainer.className = "mv_opacity_container";

    rule.opacityModeSelect = document.createElement("select");
    rule.opacityModeSelect.className = "mv_select mv_opacity_mode_sel";
    [["fixed","bim|mv.opacity.fixed"],["property","bim|mv.opacity.property"]].forEach(([v,k]) =>
    {
      const o = document.createElement("option"); o.value = v; I18N.set(o, "textContent", k);
      rule.opacityModeSelect.appendChild(o);
    });
    rule.opacityContainer.appendChild(rule.opacityModeSelect);

    rule.opacityInput = document.createElement("input");
    rule.opacityInput.type = "number"; rule.opacityInput.min = "0"; rule.opacityInput.max = "1";
    rule.opacityInput.step = "0.05"; rule.opacityInput.className = "mv_input mv_opacity_input";
    rule.opacityInput.value = initStyle.opacity ?? 0.3;
    rule.opacityContainer.appendChild(rule.opacityInput);

    rule.opacityPsetInput = document.createElement("input");
    rule.opacityPsetInput.type = "text"; rule.opacityPsetInput.className = "mv_input mv_opacity_pset";
    I18N.set(rule.opacityPsetInput, "placeholder", "bim|mv.placeholder.pset");
    if (initStyle.opacityPset) rule.opacityPsetInput.value = initStyle.opacityPset;
    rule.opacityContainer.appendChild(rule.opacityPsetInput);

    rule.opacityParamInput = document.createElement("input");
    rule.opacityParamInput.type = "text"; rule.opacityParamInput.className = "mv_input mv_opacity_param";
    I18N.set(rule.opacityParamInput, "placeholder", "bim|mv.placeholder.param");
    if (initStyle.opacityParam) rule.opacityParamInput.value = initStyle.opacityParam;
    rule.opacityContainer.appendChild(rule.opacityParamInput);

    thenRow.appendChild(rule.opacityContainer);
    block.appendChild(thenRow);

    // Wire action visibility (reuse same logic as _addEntry)
    const updateVis = () => this._updateStylizationVisibility(rule);
    rule.actionSelect.addEventListener("change", updateVis);
    rule.opacityModeSelect.addEventListener("change", updateVis);
    if (initStyle.opacityMode) rule.opacityModeSelect.value = initStyle.opacityMode;
    updateVis();

    rule.elem = block;
    this._rules.push(rule);
    this._rulesContainer.appendChild(block);
    this._refreshSeparators();
    this.application.i18n?.updateTree(block);
    return rule;
  }

  /** Update visibility of color/opacity controls in THEN section. */
  _updateStylizationVisibility(rule)
  {
    const action = rule.actionSelect.value;
    rule.colorInput.style.display = action === "color" ? "" : "none";
    rule.opacityContainer.style.display = action === "transparent" ? "" : "none";
    if (action === "transparent")
    {
      const isFixed = rule.opacityModeSelect.value === "fixed";
      rule.opacityInput.style.display      = isFixed ? "" : "none";
      rule.opacityPsetInput.style.display  = isFixed ? "none" : "";
      rule.opacityParamInput.style.display = isFixed ? "none" : "";
    }
  }

  /**
   * Recursively build a live tree node (with DOM refs) from a plain ExprNode.
   * Appends the node's root element to containerElem.
   *
   * Live node shapes (always have DOM refs + stale plain fields):
   *   LEAF:       { type:"LEAF", pset, param, mode, value,     psetSelect, paramSelect, modeSelect, valueInput, elem }
   *   Combinator: { type:"AND"|"OR"|"NOT", args:[...], typeSelect, childrenContainer, elem }
   *
   * CRITICAL: The plain fields (pset/param/mode/value) on a LEAF are set at creation time and
   * are NEVER updated when the user edits the select/input elements. After creation:
   *   - For display/label: use _describeExpr(node) which reads psetSelect?.value || pset (safe fallback).
   *   - For evaluation: use _readTreeNode(node) to produce a fresh snapshot, then _evalExpr(snapshot, obj).
   *   - NEVER call _evalExpr() on a live node directly — the stale fields will give wrong results.
   *
   * @param {Object} rule - the enclosing rule (provides context for pset/param dropdown fill)
   * @param {Object} exprNode - plain ExprNode to recreate (source data)
   * @param {Function|null} onDelete - called to notify parent when this node is removed
   * @param {HTMLElement} containerElem - where to append the resulting DOM element
   * @param {number} [depth=0] - nesting depth (0=root combinator, 1=child, >=2 nested).
   *   At depth >= 1 the "Add Sub-condition" button is hidden to limit tree nesting.
   * @param {HTMLElement[]} [extraBtns=[]] - extra buttons to append to the root combinator
   *   header (after the built-in delete button). Used by _addStylization() to inject the
   *   move-up, move-down and delete-rule buttons into the root AND/OR header row so they
   *   appear in a single, compact header instead of a separate .mv_styl_header bar.
   * @returns {Object} live node object with DOM refs
   */
  _loadTreeNode(rule, exprNode, onDelete, containerElem, depth = 0, extraBtns = [])
  {
    if (!exprNode) return null;

    if (exprNode.type === "LEAF")
    {
      // ── Leaf node ────────────────────────────────────────────────────────
      const node = {
        type: "LEAF",
        pset:  exprNode.pset  || "__ifcClass__",
        param: exprNode.param || "",
        mode:  exprNode.mode  || "exact",
        value: exprNode.value || "",
      };

      const row = document.createElement("div");
      row.className = "mv_tree_leaf";
      node.elem = row;

      // ── Row 1: selectors + delete button ──
      const row1 = document.createElement("div");
      row1.className = "mv_tree_leaf_row1";
      row.appendChild(row1);

      // Pset selector
      node.psetSelect = document.createElement("select");
      node.psetSelect.className = "mv_select mv_tree_pset";
      this._fillPsetSelect(node.psetSelect);
      if (node.pset && [...node.psetSelect.options].some(o => o.value === node.pset))
        node.psetSelect.value = node.pset;
      row1.appendChild(node.psetSelect);

      // Param selector
      node.paramSelect = document.createElement("select");
      node.paramSelect.className = "mv_select mv_tree_param";
      row1.appendChild(node.paramSelect);

      // Mode selector (operator: exact/contains/gt/etc.)
      node.modeSelect = this._matchModeSelect();
      node.modeSelect.className += " mv_tree_mode";
      if (node.mode) node.modeSelect.value = node.mode;
      row1.appendChild(node.modeSelect);

      // ── Row 2: value input ──
      const row2 = document.createElement("div");
      row2.className = "mv_tree_leaf_row2";
      row.appendChild(row2);

      // ── Value widget: two elements, only one visible at a time ──────────────
      //   · _textInput  — free-text <input> for numeric values and non-exact modes
      //                   (contains / starts / ends / gt / lt / …)
      //   · _selectInput — styled <select> for exact mode when model values are text,
      //                    giving the same look as the pset/param/mode selectors
      //   · valueInput   — reference that always points to the currently active widget;
      //                    external callers (save, apply, export) always read this

      node._textInput = document.createElement("input");
      node._textInput.type = "text";
      node._textInput.className = "mv_input mv_tree_value";
      I18N.set(node._textInput, "placeholder", "bim|mv.placeholder.value_filter");
      row2.appendChild(node._textInput);

      node._selectInput = document.createElement("select");
      node._selectInput.className = "mv_select mv_tree_value";
      row2.appendChild(node._selectInput);

      // Start with text input active (updated once fillParams runs below)
      node.valueInput = node._textInput;

      // Rebuild the value <select> options from the model's unique values for
      // the current pset/param combination.  Preserves the previous selection
      // when the same value still exists after the rebuild.
      const fillValueSelect = (values) =>
      {
        const prev = node._selectInput.value;
        node._selectInput.innerHTML = "";
        values.forEach(v =>
        {
          const opt = document.createElement("option");
          opt.value = v;
          opt.textContent = v;
          node._selectInput.appendChild(opt);
        });
        if (prev && [...node._selectInput.options].some(o => o.value === prev))
          node._selectInput.value = prev;
      };

      // Decide which widget to show and keep node.valueInput in sync.
      // The <select> is only appropriate when:
      //   1. Mode is "exact" — other modes (contains/gt/lt/…) need free text
      //   2. At least one model value for this pset/param is non-numeric —
      //      showing a long list of decimal numbers would be impractical
      // The unique values are passed in from fillParams/param-change to avoid
      // traversing the model twice in a single update cycle.
      const updateValueWidget = (allVals) =>
      {
        const noVal    = NO_VALUE_MODES.has(node.modeSelect.value);
        const isExact  = node.modeSelect.value === "exact";
        const vals     = allVals ?? this._getUniqueValues(node.psetSelect.value, node.paramSelect.value);
        const hasTextValues = vals.length > 0 &&
          vals.some(v => v.trim() !== "" && isNaN(Number(v)));

        const useSelect = !noVal && isExact && hasTextValues;

        node._textInput.style.display   = (!noVal && !useSelect) ? "" : "none";
        node._selectInput.style.display = useSelect ? "" : "none";
        node.valueInput = useSelect ? node._selectInput : node._textInput;
      };

      // Rebuild param <select> when pset changes, then refresh value widget.
      // _getUniqueValues traverses the model once here and the result is
      // forwarded to both fillValueSelect and updateValueWidget to avoid a
      // second traversal.
      const fillParams = () =>
      {
        const pset = node.psetSelect.value;
        node.paramSelect.innerHTML = "";
        const isSpecial = SPECIAL_PSET_VALUES.has(pset);
        node.paramSelect.style.display = isSpecial ? "none" : "";
        if (!isSpecial)
        {
          (this._modelPsets[pset] || []).forEach(p =>
          {
            const opt = document.createElement("option");
            opt.value = p; opt.textContent = p;
            node.paramSelect.appendChild(opt);
          });
          if (node.param && [...node.paramSelect.options].some(o => o.value === node.param))
            node.paramSelect.value = node.param;
        }
        const vals = this._getUniqueValues(pset, node.paramSelect.value);
        fillValueSelect(vals);
        updateValueWidget(vals);
      };

      fillParams();

      // Restore saved value into both widgets after the initial fill so that
      // whichever one becomes active already has the correct selection/text.
      if (node.value)
      {
        if ([...node._selectInput.options].some(o => o.value === node.value))
          node._selectInput.value = node.value;
        node._textInput.value = node.value;
      }

      node.psetSelect.addEventListener("change", fillParams);
      node.paramSelect.addEventListener("change", () =>
      {
        const vals = this._getUniqueValues(node.psetSelect.value, node.paramSelect.value);
        fillValueSelect(vals);
        updateValueWidget(vals);
      });
      // Mode change only affects widget visibility, not the options list
      node.modeSelect.addEventListener("change", () => updateValueWidget());

      // Delete button (on row1, alongside selectors)
      if (onDelete)
      {
        const del = document.createElement("button");
        del.className = "mv_btn mv_danger mv_tree_del";
        del.textContent = "✕";
        I18N.set(del, "title", "bim|mv.tree.remove_condition");
        del.addEventListener("click", () => { onDelete(); row.remove(); });
        row1.appendChild(del);
      }

      this.application.i18n?.updateTree(row);
      containerElem.appendChild(row);
      return node;
    }

    // ── Combinator node (AND / OR / NOT) ─────────────────────────────────
    const node = { type: exprNode.type || "AND", args: [], childrenContainer: null, typeSelect: null };

    const wrap = document.createElement("div");
    wrap.className = "mv_tree_combinator";
    node.elem = wrap;

    // Header: type selector + add buttons + delete
    const cmbHeader = document.createElement("div");
    cmbHeader.className = "mv_tree_comb_header";

    node.typeSelect = document.createElement("select");
    node.typeSelect.className = "mv_select mv_tree_type";
    [["AND","bim|mv.tree.type.and"],["OR","bim|mv.tree.type.or"],["NOT","bim|mv.tree.type.not"]].forEach(([v, k]) =>
    {
      const o = document.createElement("option"); o.value = v; I18N.set(o, "textContent", k);
      node.typeSelect.appendChild(o);
    });
    node.typeSelect.value = node.type;
    // When switching to NOT, disable add buttons if there's already 1 child
    const updateAddBtnsForType = () =>
    {
      node.type = node.typeSelect.value;
      if (!node.childrenContainer) return; // called before childrenContainer exists during init
      const isNot = node.typeSelect.value === "NOT";
      const hasChild = node.args.length > 0;
      addLeafBtn.disabled  = isNot && hasChild;
      addGroupBtn.disabled = isNot && hasChild;
      addLeafBtn.title  = (isNot && hasChild) ? "NOT can only have one child" : "";
      addGroupBtn.title = (isNot && hasChild) ? "NOT can only have one child" : "";
    };
    node.typeSelect.addEventListener("change", updateAddBtnsForType);
    cmbHeader.appendChild(node.typeSelect);

    // Add leaf (condition) button
    const addLeafBtn = document.createElement("button");
    addLeafBtn.className = "mv_btn mv_tree_add";
    I18N.set(addLeafBtn, "textContent", "bim|mv.tree.add_condition");
    addLeafBtn.addEventListener("click", () =>
    {
      const childExpr = { type: "LEAF", pset: "__ifcClass__", param: "", mode: "exact", value: "" };
      let createdLeaf;
      const onChildDel = () =>
      {
        node.args = node.args.filter(n => n !== createdLeaf);
        updateAddBtnsForType();
      };
      createdLeaf = this._loadTreeNode(rule, childExpr, onChildDel, node.childrenContainer, depth + 1);
      node.args.push(createdLeaf);
      updateAddBtnsForType();
      this.application.i18n?.updateTree(createdLeaf.elem);
    });
    cmbHeader.appendChild(addLeafBtn);

    // Add group (nested combinator) button — hidden at depth >= 1 to limit nesting to 1 level.
    const addGroupBtn = document.createElement("button");
    addGroupBtn.className = "mv_btn mv_tree_add";
    I18N.set(addGroupBtn, "textContent", "bim|mv.tree.add_group");
    if (depth >= 1) addGroupBtn.style.display = "none";
    addGroupBtn.addEventListener("click", () =>
    {
      // Auto-seed the new group with one empty LEAF so it is never visually empty.
      const childExpr = {
        type: "AND",
        args: [{ type: "LEAF", pset: "__ifcClass__", param: "", mode: "exact", value: "" }]
      };
      let createdGroup;
      const onChildDel = () =>
      {
        node.args = node.args.filter(n => n !== createdGroup);
        updateAddBtnsForType();
      };
      createdGroup = this._loadTreeNode(rule, childExpr, onChildDel, node.childrenContainer, depth + 1);
      node.args.push(createdGroup);
      updateAddBtnsForType();
      this.application.i18n?.updateTree(createdGroup.elem);
    });
    cmbHeader.appendChild(addGroupBtn);

    // Delete button (only non-root nodes have a delete button)
    if (onDelete)
    {
      const del = document.createElement("button");
      del.className = "mv_btn mv_danger mv_tree_del";
      del.textContent = "✕";
      I18N.set(del, "title", "bim|mv.tree.remove_group");
      del.addEventListener("click", () => { onDelete(); wrap.remove(); });
      cmbHeader.appendChild(del);
    }

    // Extra buttons (move up/down + delete rule) injected by _addStylization for the root node
    extraBtns.forEach(btn => cmbHeader.appendChild(btn));

    wrap.appendChild(cmbHeader);

    // Children container
    node.childrenContainer = document.createElement("div");
    node.childrenContainer.className = "mv_tree_children";
    wrap.appendChild(node.childrenContainer);

    // Load initial children from exprNode.args
    (exprNode.args || []).forEach(childExpr =>
    {
      // Use a self-referencing delete so the closure captures the correct child ref
      let createdChild;
      const onChildDel = () =>
      {
        node.args = node.args.filter(n => n !== createdChild);
        updateAddBtnsForType(); // re-enable add buttons when a child is removed
      };
      createdChild = this._loadTreeNode(rule, childExpr, onChildDel, node.childrenContainer, depth + 1);
      if (createdChild) node.args.push(createdChild);
    });
    updateAddBtnsForType(); // set initial disabled state

    containerElem.appendChild(wrap);
    return node;
  }

  /**
   * Read a live tree node back to a plain ExprNode (snapshot), syncing values from DOM refs.
   * Called at _apply() time to capture the current UI state for evaluation via _evalExpr().
   * Also called by _currentConfig() to serialize the current rule state.
   *
   * Returns null for incomplete nodes (e.g. LEAF with a value-requiring mode but empty input),
   * which causes the node to be excluded from evaluation and saved configs.
   *
   * @param {Object} node - live tree node with DOM refs (psetSelect, modeSelect, valueInput, etc.)
   * @returns {Object|null} plain ExprNode snapshot (no DOM refs) or null if incomplete
   */
  _readTreeNode(node)
  {
    if (!node) return null;
    if (node.type === "LEAF")
    {
      const mode  = node.modeSelect?.value  || "exact";
      const value = node.valueInput?.value.trim() || "";
      // Incomplete leaf: value-requiring modes with empty value → treat as no condition
      if (!NO_VALUE_MODES.has(mode) && !value) return null;
      return {
        type:  "LEAF",
        pset:  node.psetSelect?.value  || "",
        param: node.paramSelect?.value || "",
        mode,
        value,
      };
    }
    // Combinator: use live typeSelect value (user may have changed it)
    const currentType = node.typeSelect?.value || node.type;
    const args = (node.args || []).map(a => this._readTreeNode(a)).filter(Boolean);
    if (args.length === 0) return null;      // empty combinator = no condition
    return { type: currentType, args };
  }

  /**
   * Read the THEN style from a tree-based rule's input elements.
   * @param {Object} rule - tree rule with actionSelect, colorInput, etc.
   * @returns {Object} plain style object
   */
  _readStylizationStyle(rule)
  {
    return {
      action:       rule.actionSelect?.value       || "color",
      color:        rule.colorInput?.value         || "#1f77b4",
      opacityMode:  rule.opacityModeSelect?.value  || "fixed",
      opacity:      parseFloat(rule.opacityInput?.value) || 0.3,
      opacityPset:  rule.opacityPsetInput?.value.trim()  || "",
      opacityParam: rule.opacityParamInput?.value.trim() || "",
    };
  }

  _onRulePsetChange(rule)
  {
    const pset = rule.psetSelect.value;
    rule.paramSelect.innerHTML = "";
    const isSpecial = SPECIAL_PSET_VALUES.has(pset);
    rule.paramSelect.style.display = isSpecial ? "none" : "";
    if (isSpecial) return;
    (this._modelPsets[pset] || []).forEach(p =>
    {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      rule.paramSelect.appendChild(opt);
    });
  }

  _refreshRulePset(rule)
  {
    // Tree-based stylizations have no single psetSelect — leaf nodes manage their
    // own selects independently. Refreshing them here would require traversing the
    // live node tree; for now we re-fill each leaf's pset select via _refreshTreeLeafs().
    if (rule._format === "tree") { this._refreshTreeLeafs(rule.conditionNode); return; }

    const prev = rule.psetSelect.value;
    this._fillPsetSelect(rule.psetSelect);
    if (prev && [...rule.psetSelect.options].some(o => o.value === prev))
      rule.psetSelect.value = prev;
    this._onRulePsetChange(rule);
    this.application.i18n?.updateTree(rule.psetSelect);
  }

  /**
   * Recursively refresh all leaf pset selects in a tree node after a class filter change.
   * Called by _refreshRulePset for tree-format rules.
   */
  _refreshTreeLeafs(node)
  {
    if (!node) return;
    if (node.type === "LEAF")
    {
      if (!node.psetSelect) return;
      const prev = node.psetSelect.value;
      this._fillPsetSelect(node.psetSelect);
      if (prev && [...node.psetSelect.options].some(o => o.value === prev))
        node.psetSelect.value = prev;
      // Trigger param fill for the (now possibly updated) pset
      node.psetSelect.dispatchEvent(new Event("change"));
      return;
    }
    (node.args || []).forEach(child => this._refreshTreeLeafs(child));
  }

  _onPsetChange()
  {
    const pset = this.psetSelect.value;
    this.paramSelect.innerHTML = "";
    const isSpecial = SPECIAL_PSET_VALUES.has(pset);
    this._paramRow.style.display = isSpecial ? "none" : "";

    if (!isSpecial)
    {
      (this._modelPsets[pset] || []).forEach(p =>
      {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        this.paramSelect.appendChild(opt);
      });
    }
  }

  _matchModeSelect()
  {
    const sel = document.createElement("select");
    sel.className = "mv_select mv_match_select";
    [
      ["exact",        "bim|mv.filter.exact"],
      ["contains",     "bim|mv.filter.contains"],
      ["starts",       "bim|mv.filter.starts"],
      ["ends",         "bim|mv.filter.ends"],
      ["not_exact",    "bim|mv.filter.not_exact"],
      ["not_contains", "bim|mv.filter.not_contains"],
      ["not_starts",   "bim|mv.filter.not_starts"],
      ["not_ends",     "bim|mv.filter.not_ends"],
      ["gt",           "bim|mv.filter.gt"],
      ["gte",          "bim|mv.filter.gte"],
      ["lt",           "bim|mv.filter.lt"],
      ["lte",          "bim|mv.filter.lte"],
      ["has_param",    "bim|mv.filter.has_param"],
      ["no_param",     "bim|mv.filter.no_param"],
      ["has_value",    "bim|mv.filter.has_value"],
      ["no_value",     "bim|mv.filter.no_value"],
    ].forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      sel.appendChild(opt);
    });
    return sel;
  }

  // ─── Value retrieval from an object ──────────────────────────────────────

  _getValue(obj, pset, param)
  {
    if (pset === "__ifcClass__") return obj.userData?.IFC?.ifcClassName ?? null;
    if (pset === "__ifcType__")  return obj.links?.ifcType?.name ?? null;
    if (pset === "__storey__")   return this._getSpatialParent(obj, "IfcBuildingStorey");
    if (pset === "__building__") return this._getSpatialParent(obj, "IfcBuilding");
    if (pset === "__site__")     return this._getSpatialParent(obj, "IfcSite");
    if (pset === "__system__")
      return this._getGroupOf(obj, ["IfcSystem","IfcBuiltSystem","IfcDistributionSystem","IfcDistributionCircuit"]);
    if (pset === "__zone__")  return this._getGroupOf(obj, ["IfcZone"]);
    if (pset === "__group__") return this._getGroupOf(obj, ["IfcGroup"]);

    const val = obj.userData?.[pset]?.[param];
    if (val !== undefined) return val;
    return obj.links?.ifcType?.userData?.[pset]?.[param] ?? null;
  }

  _hasParam(obj, pset, param)
  {
    if (SPECIAL_PSET_VALUES.has(pset)) return this._getValue(obj, pset, param) !== null;
    return obj.userData?.[pset]?.[param] !== undefined ||
           obj.links?.ifcType?.userData?.[pset]?.[param] !== undefined;
  }

  _getUniqueValues(pset, param)
  {
    const vals = new Set();
    this.application.baseObject?.traverse(obj =>
    {
      const cls = obj.userData?.IFC?.ifcClassName;
      if (!cls || !obj.userData?.IFC?.GlobalId) return;
      if (DEFAULT_EXCLUDED.has(cls)) return;
      const v = this._getValue(obj, pset, param);
      if (v !== null && v !== undefined && String(v).trim() !== "")
      {
        const sv = String(v).trim();
        if (pset === "__ifcClass__" && sv.endsWith("Type")) return;
        vals.add(sv);
      }
    });
    return Array.from(vals).sort();
  }

  _getSpatialParent(obj, targetClass)
  {
    let current = obj.parent;
    while (current)
    {
      if (current.userData?.IFC?.ifcClassName === targetClass)
        return current.userData.IFC.Name || current.userData.IFC.GlobalId || targetClass;
      current = current.parent;
    }
    return null;
  }

  _getGroupOf(obj, classNames)
  {
    const ud = obj.userData;
    for (const key of Object.keys(ud))
    {
      for (const cls of classNames)
      {
        const prefix = "IFC_group_" + cls + "_";
        if (key.startsWith(prefix)) return key.slice(prefix.length) || cls;
      }
    }
    return null;
  }

  // ─── Apply Model Validation ──────────────────────────────────────────────────

  _apply()
  {
    const app = this.application;

    // Destroy the batched group if present so individual meshes are visible
    // and materials can be applied correctly.
    if (typeof app.destroyBatchedGroup === "function") app.destroyBatchedGroup();
    if (app.baseObject) app.baseObject.visible = true;
    // Prevent the engine from re-creating the batch while SmartView is active
    if ("disableBatchCreation" in app) app.disableBatchCreation = true;

    this._resetMaterials();
    if (!app.baseObject) return;

    const selectedClasses = new Set(this._getSelectedClasses());


    const pset       = this.psetSelect.value;
    const param      = this.paramSelect.value;
    const othersMode = this.othersSelect.value;
    const ruleOp     = this.ruleOpSelect.value;
    const isFilterMode = this._modeValue === "filter";

    // Build active rules. Each rule is enriched with a `stylizations` array
    // (computed via _ruleToStylizations) so that _findMatchingStyle() can use
    // _evalExpr() for evaluation. The flat `entries` array is kept for legend
    // display and backward-compatibility with _matchRuleEntries().
    const activeRules = this._rules.map(r =>
    {
      // ── Tree-based stylization (Phase 3) ─────────────────────────────────
      if (r._format === "tree")
      {
        const condition = this._readTreeNode(r.conditionNode);
        if (!condition) return null;
        const style = this._readStylizationStyle(r);
        return {
          pset: null, param: null,
          entries: [],               // empty for legend compat
          stylizations: [{ condition, style }],
          _format: "tree", _style: style,
          conditionNode: r.conditionNode, // live node ref for _describeExpr in legend
          nameInput: r.nameInput,         // live ref so legend reads current value
        };
      }
      // ── Flat-entry rule (backward-compat) ────────────────────────────────
      const entries = r.entries.map(e => ({
        pset:        r.psetSelect.value,
        param:       r.paramSelect.value,
        op:          e.opSelect?.value ?? null,
        mode:        e.matchSelect.value,
        value:       e.valueInput.value.trim(),
        action:      e.actionSelect.value,
        color:       e.colorInput.value,
        opacityMode: e.opacityModeSelect.value,
        opacity:     parseFloat(e.opacityInput.value),
        opacityPset: e.opacityPsetInput.value.trim(),
        opacityParam: e.opacityParamInput.value.trim(),
      })).filter(e => e.value !== "" || NO_VALUE_MODES.has(e.mode));
      const stylizations = this._ruleToStylizations(entries);
      return { pset: r.psetSelect.value, param: r.paramSelect.value, entries, stylizations };
    }).filter(r => r && r.stylizations.length > 0);

    const hasFilter = isFilterMode && activeRules.length > 0;


    // findMatch closure encapsulates the AND/OR rule logic for the current _apply() execution.
    // All legend click handlers must call findMatch to determine whether an object is "visible"
    // in the current view (needed to compute correct intersections like "IfcWall on floor P0").
    //
    // ruleOp AND: ALL rules must match; return the first matching rule's style (or null if any fails).
    // ruleOp OR:  return the FIRST rule's style that matches (first hit wins).
    const findMatch = obj =>
    {
      if (!hasFilter) return null;
      if (ruleOp === "AND")
      {
        let firstStyle = null;
        for (const rule of activeRules)
        {
          const style = this._findMatchingStyle(rule.stylizations, obj);
          if (!style) return null;
          if (!firstStyle) firstStyle = style;
        }
        return firstStyle;
      }
      else
      {
        for (const rule of activeRules)
        {
          const style = this._findMatchingStyle(rule.stylizations, obj);
          if (style) return style;
        }
        return null;
      }
    };

    // Note: selectedClasses is always empty now that the class selector is hidden;
    // all non-excluded IFC objects are in scope (inScope check below uses size===0 as "all").

    // 1. Collect unique values for the color-by-property legend
    const valueSet = new Set();
    app.baseObject.traverse(obj =>
    {
      const cls = obj.userData?.IFC?.ifcClassName;
      if (!cls || DEFAULT_EXCLUDED.has(cls)) return;
      if (cls.endsWith("Type") || cls.endsWith("Style")) return;
      if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return;
      const v = this._getValue(obj, pset, param);
      if (v !== null && v !== undefined && String(v).trim() !== "")
        valueSet.add(String(v).trim());
    });
    const valueList = Array.from(valueSet).sort();
    this._valueColorMap = {};
    valueList.forEach((v, i) => { this._valueColorMap[v] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });

    // 2. Material cache
    const matCache = {};
    const getMat = (hex, opacity = 1) =>
    {
      const key = hex + "|" + opacity;
      if (!matCache[key])
        matCache[key] = new THREE.MeshLambertMaterial({
          color: new THREE.Color(hex),
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity >= 1,
          side: THREE.DoubleSide,
        });
      return matCache[key];
    };
    const othersMat = othersMode === "transparent" ? getMat("#aaaaaa", 0.12) : null;

    // 3. Construir mapa d'objecte → material
    const objectMaterialMap = new Map();
    app.baseObject.traverse(obj =>
    {
      const cls = obj.userData?.IFC?.ifcClassName;
      if (!cls) return;
      // IFC type/style objects (IfcWallType, IfcDoorStyle, etc.) are definitions, not instances.
      // They have no visible geometry and must not receive color or block inheritance.
      if (cls.endsWith("Type") || cls.endsWith("Style"))
      {
        if (obj.userData.IFC?.GlobalId) objectMaterialMap.set(obj, null);
        return;
      }
      if (DEFAULT_EXCLUDED.has(cls))
      {
        // Block color inheritance: excluded objects (IfcOpeningElement etc.) must not
        // inherit color from a colored parent (e.g. IfcWallStandardCase → IfcOpeningElement
        // would make the void geometry appear colored, confusing ray-picking with IfcDoor).
        if (obj.userData.IFC?.GlobalId)
        {
          objectMaterialMap.set(obj, null);
        }
        return;
      }
      // Skip geometry representation items (IfcExtrudedAreaSolid etc.) — they have
      // ifcClassName but no GlobalId. Let them inherit material from their IFC product parent.
      if (!obj.userData.IFC.GlobalId) return;

      const inScope = selectedClasses.size === 0 || selectedClasses.has(cls);

      if (!inScope)
      {
        if (othersMode === "transparent") { objectMaterialMap.set(obj, othersMat); }
        else if (othersMode === "hidden")
        {
          // Hide the visual geometry of non-scope objects.
          // We target .faces/.edges (inside Solids) rather than Object3D containers, because
          // IsolateSelectionTool's updateVisibility stops traversal at Solid and never touches
          // .faces/.edges — so our hidden state survives isolation cycles.
          // Exception: if this non-scope object has in-scope descendants (e.g. IfcWallStandardCase
          // containing an IfcDoor that IS in scope), we must keep the container Object3D visible
          // (THREE.js cascade) and only hide its own geometry via _hideAncestorGeometry.
          if (this._hasInScopeDescendant(obj, selectedClasses))
          {
            this._hideAncestorGeometry(obj, selectedClasses);
          }
          else
          {
            this._hideFaces(obj);
          }
          objectMaterialMap.set(obj, null);
        }
        // othersMode === "normal": leave non-scope objects untouched (original IFC material)
      }
      else if (hasFilter)
      {
        const match = findMatch(obj);
        if (match)
        {
          const { action, color, opacityMode, opacity, opacityPset, opacityParam } = match;
          if (action === "hide")
          {
            this._hide(obj);
            objectMaterialMap.set(obj, null); // explicit null blocks inheritance to children
          }
          else if (action === "color")
          {
            objectMaterialMap.set(obj, getMat(color, 1));
          }
          else if (action === "transparent")
          {
            const op = opacityMode === "property"
              ? (parseFloat(this._getValue(obj, opacityPset, opacityParam)) || 0.3)
              : (isNaN(opacity) ? 0.3 : opacity);
            objectMaterialMap.set(obj, { meshOpacity: op });
          }
          // action === "show": no visual change, object keeps original appearance
        }
        else
        {
          // In-scope object that doesn't match any filter rule.
          // Behaviour follows othersMode: normal = keep original, hidden = hide, transparent = ghost.
          if (othersMode === "transparent") { objectMaterialMap.set(obj, othersMat); }
          else if (othersMode === "hidden")
          {
            this._hideFaces(obj);
            objectMaterialMap.set(obj, null);
          }
          // othersMode === "normal": leave unmatched objects untouched (original IFC material)
        }
      }
      else
      {
        // Mode: color by property
        const v = this._getValue(obj, pset, param);
        const vStr = (v !== null && v !== undefined) ? String(v).trim() : null;
        const color = vStr ? this._valueColorMap[vStr] : null;
        if (color)
        {
          objectMaterialMap.set(obj, getMat(color, 1));
        }
        else
        {
          if (othersMode === "hidden")
          {
            this._hide(obj);
            objectMaterialMap.set(obj, null);
          }
          else if (othersMode === "transparent") { objectMaterialMap.set(obj, othersMat); }
          else                                   { objectMaterialMap.set(obj, getMat("#888888", 0.4)); }
        }
      }
    });

    // 4. Apply materials via ObjectUtils
    this._applyMaterialMap(objectMaterialMap);

    this._applied = true;

    // 5. Llegenda
    {
      if (hasFilter)
        this._showFilterLegend(activeRules, ruleOp, findMatch, selectedClasses);
      else if (!isFilterMode)
        this._showLegend(valueList, selectedClasses, pset, param);
    }

    app.repaint();
  }

  _hide(obj)
  {
    if (obj.__svOrigVisible === undefined) obj.__svOrigVisible = obj.visible;
    obj.visible = false;
  }

  /**
   * Hide the .faces and .edges nodes (inside Solids) of a single IFC product, without affecting
   * nested child IFC products (e.g. IfcWindow inside IfcWall).
   *
   * Why .faces/.edges and not Object3D.visible?
   * IsolateSelectionTool.updateVisibility() traverses the tree but STOPS at Solid class — it never
   * visits .faces/.edges inside Solids. So hiding these leaf nodes survives IsolateSelectionTool cycles.
   * Setting visible=false on the Object3D container would be RESET by the isolation tool.
   *
   * @param {THREE.Object3D} obj - IFC product whose geometry to hide
   */
  _hideFaces(obj)
  {
    // Hide the visual leaf nodes (.faces/.edges inside Solids) of THIS IFC product only.
    // Uses a manual recursive traversal that stops at nested IFC product boundaries
    // (any descendant with GlobalId other than obj itself) so that child IFC products
    // (e.g. IfcWindow nested inside IfcWall) are not inadvertently hidden when the
    // parent product is hidden by a filter rule. THREE.js traverse() would visit ALL
    // descendants, crossing product boundaries — so we must avoid it here.
    const recurse = node =>
    {
      if (node !== obj && node.userData?.IFC?.GlobalId) return; // stop at nested IFC product
      if (node.name?.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      {
        this._hide(node);
      }
      for (const child of node.children) recurse(child);
    };
    recurse(obj);
  }

  /**
   * Check if any descendant of obj is an in-scope IFC product.
   * Used in _apply() to decide: if a non-scope ancestor contains in-scope children,
   * we must NOT hide the ancestor container (would cascade down THREE.js tree hiding children).
   * Instead we call _hideAncestorGeometry() to selectively hide only the ancestor's own faces.
   *
   * @param {THREE.Object3D} obj
   * @param {Set<string>} selectedClasses - set of IFC class names currently in scope
   * @returns {boolean}
   */
  _hasInScopeDescendant(obj, selectedClasses)
  {
    // Returns true if any descendant of obj is an IFC product whose class is in selectedClasses.
    // Used to avoid hiding a non-scope ancestor (e.g. IfcWallStandardCase) when it contains
    // in-scope children (e.g. IfcDoor), since hiding the parent would also hide those children.
    let found = false;
    obj.traverse((child) =>
    {
      if (!found && child !== obj
          && child.userData?.IFC?.GlobalId
          && selectedClasses.has(child.userData.IFC.ifcClassName))
      {
        found = true;
      }
    });
    return found;
  }

  /**
   * Check if any ancestor of obj is an in-scope IFC product.
   * Used to detect nested scope: e.g. IfcDoor (scope) inside IfcWall (also scope).
   * In that case the IfcDoor should not be hidden twice, and material inheritance needs care.
   *
   * @param {THREE.Object3D} obj
   * @param {Set<string>} selectedClasses
   * @returns {boolean}
   */
  _hasInScopeAncestor(obj, selectedClasses)
  {
    // Returns true if any ancestor of obj is an IFC product whose class is in selectedClasses.
    // Used to detect nested IFC products (e.g. IfcDoor inside IfcWallStandardCase) when both
    // classes are in scope simultaneously.
    let parent = obj.parent;
    while (parent)
    {
      if (parent.userData?.IFC?.GlobalId &&
          selectedClasses.has(parent.userData.IFC.ifcClassName))
        return true;
      parent = parent.parent;
    }
    return false;
  }

  _restoreLegendPreHide()
  {
    // Restore faces that were hidden by a previous legend click pre-hide.
    // Called at the start of each legend click and during _reset().
    if (!this._legendPreHiddenFaces) return;
    for (const face of this._legendPreHiddenFaces) face.visible = true;
    this._legendPreHiddenFaces = [];
  }

  /**
   * Hide .faces/.edges of an IFC product for legend pre-hiding, with tracking for easy restore.
   * Unlike _hideFaces(), this version records what it hid in _legendPreHiddenFaces so that
   * _restoreLegendPreHide() can undo between legend clicks, without touching SmartView's
   * __svOrigVisible state (which is managed by SmartViewPanel separately).
   *
   * @param {THREE.Object3D} obj - IFC product to pre-hide for legend click isolation
   */
  _legendHideFaces(obj)
  {
    // Hide .faces/.edges of an IFC product's Solid to protect against IsolateSelectionTool
    // visibility cascade. Tracks hidden faces so _restoreLegendPreHide() can undo this
    // between legend clicks, without touching SmartView's own __svOrigVisible state.
    if (!this._legendPreHiddenFaces) this._legendPreHiddenFaces = [];
    obj.traverse(child =>
    {
      if (child.name?.startsWith(THREE.Object3D.HIDDEN_PREFIX) && child.visible)
      {
        child.visible = false;
        this._legendPreHiddenFaces.push(child);
      }
    });
  }

  _performLegendSelect(objs)
  {
    // Restore faces pre-hidden by a previous legend click, then pre-hide geometry
    // of IFC descendants of selected objects that are NOT in the selection.
    // IsolateSelectionTool cascades visibility into selected objects' subtrees,
    // which would reveal nested IFC products (e.g. furniture inside IfcSpace,
    // doors inside IfcWall) that don't belong to the current selection.
    // Pre-hiding their .faces/.edges (never visited by IsolateSelectionTool inside
    // Solid) keeps them geometrically invisible during isolation.
    this._restoreLegendPreHide();

    const selectedSet = new Set(objs);
    objs.forEach(selectedObj =>
    {
      selectedObj.traverse(child =>
      {
        if (child === selectedObj) return;
        if (!child.userData?.IFC?.GlobalId) return;
        if (DEFAULT_EXCLUDED.has(child.userData.IFC.ifcClassName)) return;
        if (selectedSet.has(child)) return;
        this._legendHideFaces(child);
      });
    });

    this.application.selectObjects?.(objs);
  }

  _hideAncestorGeometry(obj, selectedClasses)
  {
    // For a non-scope IFC product that contains in-scope descendants, we cannot call
    // _hide(obj) because THREE.js would cascade visible=false to in-scope children.
    // Instead, we hide only the geometry (non-IFC-product) children directly, and
    // recurse into IFC product intermediaries (e.g. IfcOpeningElement) that also
    // contain in-scope descendants.
    for (const child of obj.children)
    {
      const gid = child.userData?.IFC?.GlobalId;
      const cls = child.userData?.IFC?.ifcClassName;
      if (!gid)
      {
        // Pure geometry node (Solid etc., no GlobalId): hide its visual faces/edges.
        this._hideFaces(child);
      }
      else if (!selectedClasses.has(cls) && this._hasInScopeDescendant(child, selectedClasses))
      {
        // Non-scope product (e.g. IfcOpeningElement) that is itself an ancestor of in-scope:
        // recurse to hide its geometry while leaving in-scope grandchildren intact.
        this._hideAncestorGeometry(child, selectedClasses);
      }
      else if (!selectedClasses.has(cls))
      {
        // Non-scope product with no in-scope descendants: hide all its faces/edges.
        this._hideFaces(child);
      }
      // else: in-scope product → leave alone
    }
  }

  /**
   * Recursively apply a material map to the scene, with parent-to-child inheritance.
   *
   * Map semantics:
   *   map.has(obj) == false → inherit parentMat from the nearest mapped ancestor
   *   map.get(obj) === null → explicit "block inheritance" (used for DEFAULT_EXCLUDED objects,
   *                           IfcType/Style objects, and hidden objects so children don't inherit color)
   *   map.get(obj) === { meshOpacity: N } → transparent material (semi-transparent with opacity N)
   *   map.get(obj) === Material instance → apply directly (color rules)
   *
   * Objects with class names ending in "Representation" (Solid geometry containers) are skipped here;
   * they inherit from their IFC product parent. Their .faces child (THREE.Mesh) receives the material.
   *
   * @param {Map} materialMap - produced by the traverse block in _apply()
   */
  _applyMaterialMap(materialMap)
  {
    let applied = 0;
    const apply = (obj, parentMat) =>
    {
      // Skip HIDDEN objects (.faces, .edges inside Solid) — Solid.material setter already
      // updates _facesObject.material when we process the Solid itself.
      if (obj.name?.startsWith(THREE.Object3D.HIDDEN_PREFIX)) return;
      // has() distinguishes explicit null in map (= block inheritance) from absent (= inherit)
      const mat = materialMap.has(obj) ? materialMap.get(obj) : parentMat;
      if (mat === null)
      {
        ObjectUtils.applyMaterial(obj, null, false);
      }
      else if (mat !== null && mat !== undefined)
      {
        if (mat instanceof THREE.Material)
        {
          if (ObjectUtils.applyMaterial(obj, mat, false)) applied++;
        }
        else if (typeof mat === "object" && mat.meshOpacity !== undefined)
        {
          if (obj instanceof THREE.Mesh && ObjectUtils.applyMeshOpacity(obj, mat.meshOpacity)) applied++;
          else if (obj instanceof Solid && ObjectUtils.applyMeshOpacity(obj.facesObject, mat.meshOpacity)) applied++;
        }
      }
      for (const child of obj.children) apply(child, mat);
    };
    apply(this.application.baseObject, null);
  }

  // ─── ExprNode: recursive expression tree evaluator ──────────────────────
  //
  // ExprNodes are plain data objects (no DOM refs). Two uses:
  //   1. Boolean conditions (IF side): evaluated by _evalExpr(node, obj) → boolean
  //   2. Value/style fields (THEN side): evaluated by _evalValue(node, obj) → primitive
  //
  // Boolean ExprNode shapes:
  //   { type: 'AND',  args: [ExprNode, ...] }          → all args must be true
  //   { type: 'OR',   args: [ExprNode, ...] }          → at least one arg true
  //   { type: 'NOT',  args: [ExprNode] }               → single arg negated
  //   { type: 'LEAF', pset, param, mode, value }       → delegates to _matchesRule() (backward compat)
  //   { type: 'LITERAL', value }                      → Boolean(value); enables "IF true THEN ..." rules
  //   { type: 'EQUAL'|'NOT_EQUAL'|'GT'|'GTE'|'LT'|'LTE'|'CONTAINS', args:[valueNode, valueNode] }
  //   { type: 'IN',    args: [prop, ...literals] }    → sugar: OR of EQUAL on same property
  //   { type: 'BETWEEN', args: [prop, lo, hi] }       → numeric lo <= prop <= hi
  //
  // Value ExprNode shapes (resolved by _evalValue, used in comparisons and THEN style fields):
  //   { type: 'PROPERTY', group, name }               → reads obj property via _getValue(obj, group, name)
  //   { type: 'LITERAL',  value }                     → JS primitive (string, number, boolean)
  //
  // NOTE: ExprNodes are snapshots — they contain only plain JS values, never DOM refs.
  // Always produce them via _readTreeNode() (reads current DOM state at _apply() time).
  // Stored in rule.stylizations[0].condition after each _apply().

  /**
   * Resolve a value-type ExprNode to a JS primitive (string | number | boolean | null).
   * @param {Object} node - PROPERTY or LITERAL node (or any node — falls back to null)
   * @param {THREE.Object3D} obj
   * @returns {*} resolved value
   */
  _evalValue(node, obj)
  {
    if (node === null || node === undefined) return null;
    // Plain JS primitive passed directly (e.g. inside legacy style fields)
    if (typeof node !== "object") return node;
    switch (node.type)
    {
      case "PROPERTY": return this._getValue(obj, node.group, node.name);
      case "LITERAL":  return node.value;
      default:         return null;
    }
  }

  /**
   * Recursively evaluate a boolean-type ExprNode against a THREE.Object3D.
   *
   * CRITICAL: reads ONLY plain fields from node (pset, param, mode, value — no DOM refs).
   * Must be called on a snapshot ExprNode (produced by _readTreeNode() at _apply() time).
   * NEVER call this on rule.conditionNode (live DOM node) — its plain fields are stale.
   *
   * Supported node types:
   *   AND, OR, NOT            — logical combinators
   *   EQUAL, NOT_EQUAL        — string equality (coerced via String())
   *   GT, GTE, LT, LTE        — numeric comparison (coerced via parseFloat())
   *   CONTAINS                — string containment (case-sensitive)
   *   IN(prop, ...literals)   — sugar: OR of EQUAL checks (same property)
   *   BETWEEN(prop, lo, hi)   — numeric: lo <= prop <= hi
   *   LITERAL                 — Boolean(node.value); enables "IF true THEN ..." default rules
   *   LEAF                    — legacy flat-entry format; delegates to _matchesRule() (backward compat)
   *
   * @param {Object} node - ExprNode snapshot (from _readTreeNode or _entriesToExprNode — NOT live conditionNode)
   * @param {THREE.Object3D} obj - object to evaluate against
   * @returns {boolean}
   */
  _evalExpr(node, obj)
  {
    switch (node.type)
    {
      case "AND":      return node.args.every(n => this._evalExpr(n, obj));
      case "OR":       return node.args.some(n  => this._evalExpr(n, obj));
      case "NOT":      return !this._evalExpr(node.args[0], obj);
      case "LITERAL":  return Boolean(node.value);
      case "LEAF":     return this._matchesRule(obj, node.pset, node.param, node.mode, node.value);

      // ── Comparison operators ─────────────────────────────────────────────
      case "EQUAL":
      {
        const [a, b] = node.args;
        return String(this._evalValue(a, obj)) === String(this._evalValue(b, obj));
      }
      case "NOT_EQUAL":
      {
        const [a, b] = node.args;
        return String(this._evalValue(a, obj)) !== String(this._evalValue(b, obj));
      }
      case "GT":
      {
        const [a, b] = node.args;
        return parseFloat(this._evalValue(a, obj)) > parseFloat(this._evalValue(b, obj));
      }
      case "GTE":
      {
        const [a, b] = node.args;
        return parseFloat(this._evalValue(a, obj)) >= parseFloat(this._evalValue(b, obj));
      }
      case "LT":
      {
        const [a, b] = node.args;
        return parseFloat(this._evalValue(a, obj)) < parseFloat(this._evalValue(b, obj));
      }
      case "LTE":
      {
        const [a, b] = node.args;
        return parseFloat(this._evalValue(a, obj)) <= parseFloat(this._evalValue(b, obj));
      }
      case "CONTAINS":
      {
        const [a, b] = node.args;
        return String(this._evalValue(a, obj)).includes(String(this._evalValue(b, obj)));
      }
      // IN(prop, lit1, lit2, ...) — sugar: OR of EQUAL(prop, litN)
      case "IN":
      {
        const [prop, ...literals] = node.args;
        const v = String(this._evalValue(prop, obj));
        return literals.some(lit => String(this._evalValue(lit, obj)) === v);
      }
      // BETWEEN(prop, lo, hi) — inclusive numeric range
      case "BETWEEN":
      {
        const [prop, lo, hi] = node.args;
        const v  = parseFloat(this._evalValue(prop, obj));
        const vl = parseFloat(this._evalValue(lo,   obj));
        const vh = parseFloat(this._evalValue(hi,   obj));
        return v >= vl && v <= vh;
      }

      default:
        return false;
    }
  }

  /**
   * Resolve a style object's fields, which may be plain JS values OR ExprNodes
   * (PROPERTY / LITERAL). Returns a plain style object with resolved primitives.
   *
   * Backward compatible: if all fields are primitives (old format), they pass through
   * unchanged. When a field is an ExprNode (new format), it is evaluated against obj.
   *
   * @param {Object} style - { action, color, opacityMode, opacity, opacityPset, opacityParam }
   *                         Fields may be plain values or ExprNodes (PROPERTY/LITERAL).
   * @param {THREE.Object3D} obj
   * @returns {Object} resolved style with plain primitive values
   */
  _evalStyle(style, obj)
  {
    const r = f => (f && typeof f === "object" && f.type) ? this._evalValue(f, obj) : f;
    return {
      action:       r(style.action),
      color:        r(style.color),
      opacityMode:  r(style.opacityMode),
      opacity:      r(style.opacity),
      opacityPset:  r(style.opacityPset),
      opacityParam: r(style.opacityParam),
    };
  }

  /**
   * Convert a flat entries array (old flat-rule UI format) into an ExprNode tree.
   * Used by the flat rule path; tree-based stylizations use _readTreeNode() instead.
   *
   * Grouping rules:
   *   - First entry (no op) or op=OR  → starts a new OR-group
   *   - op=AND                         → ANDs with previous entry in the group
   *   - op=NOT                         → AND NOT with previous entry in the group
   *
   * Each AND-group becomes an AND node; groups are combined with an OR node.
   * A single group with a single leaf is simplified to just that leaf (no wrapping).
   *
   * @param {Array} entries - flat entry objects { pset, param, op, mode, value }
   * @returns {Object|null} ExprNode for _evalExpr(), or null if entries is empty
   */
  _entriesToExprNode(entries)
  {
    if (!entries.length) return null;

    // Split into OR-groups (each group is AND'd internally)
    const groups = [];
    let current = [];
    for (const entry of entries)
    {
      if (!entry.op || entry.op === "OR")
      {
        if (current.length) groups.push(current);
        current = [entry];
      }
      else
      {
        current.push(entry);
      }
    }
    if (current.length) groups.push(current);

    // Build a node for each OR-group
    const groupNodes = groups.map(group =>
    {
      const leafNodes = group.map(entry =>
      {
        const leaf = { type: "LEAF", pset: entry.pset, param: entry.param,
                       mode: entry.mode, value: entry.value };
        // NOT wraps the leaf in a NOT node
        return entry.op === "NOT" ? { type: "NOT", args: [leaf] } : leaf;
      });
      // AND all leaves in the group (first entry never has op=NOT — it opens the group)
      return leafNodes.length === 1 ? leafNodes[0] : { type: "AND", args: leafNodes };
    });

    // OR all groups together
    return groupNodes.length === 1 ? groupNodes[0] : { type: "OR", args: groupNodes };
  }

  // ─── Stylization helpers ────────────────────────────────────────────────

  /**
   * Convert a flat entries array (pset/param enriched per entry, produced in _apply())
   * into an ordered array of stylizations: [{ condition: ExprNode, style }, ...]
   *
   * Each OR-group becomes one stylization (first match wins ordering).
   * Style is taken from the first entry of each OR-group.
   * This is the evaluator-ready form stored in rule.stylizations after _apply().
   *
   * @param {Array} entries - enriched entries { pset, param, op, mode, value, action, color, ... }
   * @returns {Array} stylizations [{ condition: ExprNode, style: { action, color, ... } }, ...]
   */
  _ruleToStylizations(entries)
  {
    if (!entries.length) return [];

    // Split flat entries into OR-groups
    const groups = [];
    let current = [];
    for (const entry of entries)
    {
      if (!entry.op || entry.op === "OR")
      {
        if (current.length) groups.push(current);
        current = [entry];
      }
      else
      {
        current.push(entry);
      }
    }
    if (current.length) groups.push(current);

    return groups.map(group =>
    {
      // Build ExprNode for the whole group
      const leafNodes = group.map(entry =>
      {
        const leaf = { type: "LEAF", pset: entry.pset, param: entry.param,
                       mode: entry.mode, value: entry.value };
        return entry.op === "NOT" ? { type: "NOT", args: [leaf] } : leaf;
      });
      const condition = leafNodes.length === 1
        ? leafNodes[0]
        : { type: "AND", args: leafNodes };

      // Style comes from group[0] — the opening entry of each OR-group
      const head = group[0];
      const style = {
        action:      head.action,
        color:       head.color,
        opacityMode: head.opacityMode,
        opacity:     head.opacity,
        opacityPset: head.opacityPset,
        opacityParam: head.opacityParam,
      };

      return { condition, style };
    });
  }

  /**
   * Find the first matching stylization for an object.
   * Iterates stylizations in order (first match wins), evaluates condition via _evalExpr(),
   * and resolves the style via _evalStyle() (handles dynamic PROPERTY/LITERAL style fields).
   *
   * @param {Array} stylizations - [{ condition: ExprNode, style: {...} }, ...] snapshot array
   * @param {THREE.Object3D} obj - object to evaluate against
   * @returns {Object|null} resolved style { action, color, opacityMode, opacity, ... } or null
   */
  _findMatchingStyle(stylizations, obj)
  {
    for (const s of stylizations)
    {
      if (this._evalExpr(s.condition, obj)) return this._evalStyle(s.style, obj);
    }
    return null;
  }

  // ─── Rule entry matching ─────────────────────────────────────────────────

  _matchRuleEntries(obj, entries)
  {
    // Convert flat entries to ExprNode and evaluate. Returns the first entry of
    // the first matching OR-group (for appearance extraction), or null.
    //
    // NOTE: the return value is still the winning *entry object* (not a boolean)
    // because callers use _entryAppearance(entry) to extract color/action.
    // The ExprNode evaluator handles the boolean logic; group tracking here
    // identifies which entry's style should be applied.
    if (!entries.length) return null;

    // Re-derive groups in parallel so we can return group[0] on match.
    // This mirrors _entriesToExprNode grouping exactly.
    const groups = [];
    let current = [];
    for (const entry of entries)
    {
      if (!entry.op || entry.op === "OR")
      {
        if (current.length) groups.push(current);
        current = [entry];
      }
      else
      {
        current.push(entry);
      }
    }
    if (current.length) groups.push(current);

    for (const group of groups)
    {
      // Build an AND node for this group and evaluate it
      const leafNodes = group.map(entry =>
      {
        const leaf = { type: "LEAF", pset: entry.pset, param: entry.param,
                       mode: entry.mode, value: entry.value };
        return entry.op === "NOT" ? { type: "NOT", args: [leaf] } : leaf;
      });
      const groupNode = leafNodes.length === 1
        ? leafNodes[0]
        : { type: "AND", args: leafNodes };

      if (this._evalExpr(groupNode, obj)) return group[0];
    }
    return null;
  }

  /**
   * Evaluate a single LEAF condition against an IFC object.
   * The primary leaf evaluator — called by _evalExpr for LEAF nodes, and directly for flat rules.
   *
   * Supports special virtual psets (__ifcClass__, __storey__, __building__, __site__, etc.)
   * as well as real Pset names. The `value` parameter is ignored for no-value modes
   * (has_param, no_param, has_value, no_value).
   *
   * @param {THREE.Object3D} obj
   * @param {string} pset - property set name or special __xxx__ virtual key
   * @param {string} param - parameter name within pset
   * @param {string} mode - match mode: exact|contains|starts|ends|gt|gte|lt|lte|not_equal|
   *                        has_param|no_param|has_value|no_value|regex
   * @param {string} value - value to compare against (ignored for no-value modes)
   * @returns {boolean}
   */
  _matchesRule(obj, pset, param, mode, value)
  {
    if (mode === "has_param") return this._hasParam(obj, pset, param);
    if (mode === "no_param")  return !this._hasParam(obj, pset, param);
    if (mode === "has_value")
    {
      const v = this._getValue(obj, pset, param);
      return v !== null && v !== undefined && String(v).trim() !== "";
    }
    if (mode === "no_value")
    {
      // "no_value" = has the parameter but its value is empty (≠ "no_param")
      if (!this._hasParam(obj, pset, param)) return false;
      const v = this._getValue(obj, pset, param);
      return v === null || v === undefined || String(v).trim() === "";
    }

    if (!value) return false;
    const v = this._getValue(obj, pset, param);
    if (v === null || v === undefined) return false;
    const vStr = String(v).trim();
    switch (mode)
    {
      case "contains":     return vStr.toLowerCase().includes(value.toLowerCase());
      case "starts":       return vStr.toLowerCase().startsWith(value.toLowerCase());
      case "ends":         return vStr.toLowerCase().endsWith(value.toLowerCase());
      case "not_exact":    return vStr !== value;
      case "not_contains": return !vStr.toLowerCase().includes(value.toLowerCase());
      case "not_starts":   return !vStr.toLowerCase().startsWith(value.toLowerCase());
      case "not_ends":     return !vStr.toLowerCase().endsWith(value.toLowerCase());
      case "gt":           return parseFloat(vStr) >  parseFloat(value);
      case "gte":          return parseFloat(vStr) >= parseFloat(value);
      case "lt":           return parseFloat(vStr) <  parseFloat(value);
      case "lte":          return parseFloat(vStr) <= parseFloat(value);
      default:             return vStr === value; // exact
    }
  }

  _psetLabel(pset)
  {
    const sp = SPECIAL_PSETS.find(s => s[0] === pset);
    if (sp) return this.application.i18n?.get(sp[1]) || pset;
    return pset;
  }

  _matchLabel(mode, value)
  {
    // i18n-aware: uses mv.match.* keys when available, falls back to key+value.
    const i18n = this.application.i18n;
    const t = key => i18n?.get(`bim|mv.match.${key}`) || key;
    const noVal = NO_VALUE_MODES.has(mode);
    if (noVal) return t(mode);
    return `${t(mode)} "${value}"`;
  }

  /**
   * Produce a human-readable summary of an ExprNode (for legend labels and rule headers).
   * Safe to call on live DOM nodes because it has double-fallback field reading:
   *   node.psetSelect?.value || node.pset  (prefers live DOM value, falls back to stale plain field)
   * Can also be called on plain snapshot nodes (no DOM refs) where it will use the plain fields.
   *
   * Max depth is capped at 2 to avoid excessively long legend label strings.
   *
   * @param {Object} node - ExprNode (live or snapshot; LEAF or Combinator)
   * @param {number} [depth=0] - tracks nesting for parenthesis insertion
   * @returns {string} human-readable condition summary (e.g. "Pset_Common.LoadBearing = True")
   */
  _describeExpr(node, depth = 0)
  {
    if (!node) return "";
    const i18n = this.application.i18n;
    const t    = key => i18n?.get(key) || key;

    if (node.type === "LEAF")
    {
      const pset  = node.psetSelect?.value || node.pset  || "";
      const param = node.paramSelect?.value || node.param || "";
      const mode  = node.modeSelect?.value  || node.mode  || "exact";
      const value = node.valueInput?.value  || node.value || "";
      const psetLbl  = this._psetLabel(pset);
      const paramPart = !SPECIAL_PSET_VALUES.has(pset) && param ? `.${param}` : "";
      const condPart  = this._matchLabel(mode, value);
      return `${psetLbl}${paramPart} ${condPart}`;
    }

    // Combinator
    const currentType = node.typeSelect?.value || node.type || "AND";
    const typeKey = `bim|mv.tree.type.${currentType.toLowerCase()}`;
    const typeLabel = t(typeKey);

    if (currentType === "NOT")
    {
      const child = (node.args || [])[0];
      const childDesc = child ? this._describeExpr(child, depth + 1) : "";
      return `${t("bim|mv.tree.type.not")} (${childDesc})`;
    }

    if (!node.args || node.args.length === 0) return typeLabel;

    const parts = node.args.map(a => this._describeExpr(a, depth + 1)).filter(Boolean);
    const joined = parts.join(` ${typeLabel} `);
    // Wrap nested combinators in parentheses so the structure is readable
    return depth > 0 ? `(${joined})` : joined;
  }

  _setMode(mode)
  {
    this._modeValue = mode;
    this._modeColorBtn.classList.toggle("mv_mode_active", mode === "color");
    this._modeFilterBtn.classList.toggle("mv_mode_active", mode === "filter");
    this._onModeChange();
  }

  _onModeChange()
  {
    const isFilter = this._modeValue === "filter";
    this._groupBySection.style.display = isFilter ? "none" : "";
    this._filterSection.style.display  = isFilter ? "" : "none";
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  _resetMaterials()
  {
    const app = this.application;
    if (!app.baseObject) return;
    let restored = 0, unhidden = 0;
    app.baseObject.traverse(obj =>
    {
      if (obj.__svOrigVisible !== undefined)
      {
        obj.visible = obj.__svOrigVisible;
        delete obj.__svOrigVisible;
        unhidden++;
      }
      if (ObjectUtils.applyMaterial(obj, null, false)) restored++;
    });
  }

  /**
   * Reset the model to its original state, clearing all validation visualizations.
   * Restores materials, visibility, and re-enables BatchedMesh creation if it was
   * disabled by _apply() to allow per-object material assignment.
   */
  _reset()
  {
    const app = this.application;
    if (typeof app.destroyBatchedGroup === "function") app.destroyBatchedGroup();
    if (app.baseObject) app.baseObject.visible = true;
    // Re-enable batch creation (validation no longer needs individual materials)
    if ("disableBatchCreation" in app) app.disableBatchCreation = false;
    this._restoreLegendPreHide();
    this._resetMaterials();
    this._removeLegend();
    this._applied = false;
    app.repaint();
  }

  // Release batch lock if panel is hidden while validation is still applied
  onHide()
  {
    const app = this.application;
    if ("disableBatchCreation" in app) app.disableBatchCreation = false;
  }

  // ─── Legend ────────────────────────────────────────────────────────────

  _showLegend(valueList, selectedClasses, pset, param)
  {
    this._removeLegend();
    const app = this.application;
    const lgPset  = this.lgPsetSelect.value;
    const lgParam = this.lgParamSelect.value;
    const hasGroup = lgPset !== "__none__";

    const titleText = (SPECIAL_PSET_VALUES.has(pset) || param === "__auto__")
      ? this._psetLabel(pset)
      : `${this._psetLabel(pset)} → ${param}`;
    const panel = this._createLegendPanel(titleText);
    const ul = document.createElement("ul");
    ul.className = "mv_legend_list";
    panel.bodyElem.appendChild(ul);

    const noValLabel = this.application.i18n?.get("bim|mv.legend.no_value") || "— (no value)";
    const noValItem = this._legendItem("#888888", noValLabel);
    noValItem.addEventListener("click", () =>
    {
      const objs = this._findObjects(obj =>
      {
        if (!obj.userData?.IFC?.GlobalId) return false;
        const cls = obj.userData?.IFC?.ifcClassName;
        if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
        if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
        const v = this._getValue(obj, pset, param);
        return v === null || v === undefined || String(v).trim() === "";
      });
      this._performLegendSelect(objs);
    });
    ul.appendChild(noValItem);

    if (!hasGroup)
    {
      valueList.forEach(val =>
      {
        const color = this._valueColorMap[val];
        const item = this._legendItem(color, val);
        item.addEventListener("click", () =>
        {
          const objs = this._findObjects(obj =>
          {
            if (!obj.userData?.IFC?.GlobalId) return false;
            const cls = obj.userData?.IFC?.ifcClassName;
            if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
            if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
            const v = this._getValue(obj, pset, param);
            return v !== null && String(v).trim() === val;
          });
          this._performLegendSelect(objs);
        });
        ul.appendChild(item);
      });
    }
    else
    {
      const hierarchy = {};
      app.baseObject.traverse(obj =>
      {
        if (!obj.userData?.IFC?.GlobalId) return;
        const cls = obj.userData?.IFC?.ifcClassName;
        if (!cls || DEFAULT_EXCLUDED.has(cls)) return;
        if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return;
        const pv = this._getValue(obj, pset, param);
        if (pv === null || pv === undefined || String(pv).trim() === "") return;
        const pvStr = String(pv).trim();
        const sv = this._getValue(obj, lgPset, lgParam);
        const svStr = sv !== null && sv !== undefined ? String(sv).trim() : "—";
        if (!hierarchy[pvStr]) hierarchy[pvStr] = {};
        if (!hierarchy[pvStr][svStr]) hierarchy[pvStr][svStr] = [];
        hierarchy[pvStr][svStr].push(obj);
      });

      valueList.forEach(val =>
      {
        const color = this._valueColorMap[val];
        const header = this._legendItem(color, val);
        header.classList.add("mv_legend_group");
        header.addEventListener("click", () =>
        {
          const objs = this._findObjects(obj =>
          {
            if (!obj.userData?.IFC?.GlobalId) return false;
            const cls = obj.userData?.IFC?.ifcClassName;
            if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
            if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
            const v = this._getValue(obj, pset, param);
            return v !== null && String(v).trim() === val;
          });
          this._performLegendSelect(objs);
        });
        ul.appendChild(header);

        Object.keys(hierarchy[val] || {}).sort().forEach(sv =>
        {
          const subObjs = hierarchy[val][sv];
          const sub = document.createElement("li");
          sub.className = "mv_legend_subitem";
          const a = document.createElement("a");
          a.href = "#";
          a.textContent = `${sv} (${subObjs.length})`;
          a.addEventListener("click", e =>
          {
            e.preventDefault();
            e.stopPropagation();
            this._performLegendSelect(subObjs);
          });
          sub.appendChild(a);
          ul.appendChild(sub);
        });
      });
    }

  }

  _legendItem(color, label)
  {
    const li = document.createElement("li");
    li.className = "mv_legend_item";
    const a = document.createElement("a");
    a.href = "#";
    a.addEventListener("click", e => e.preventDefault());
    const swatch = document.createElement("span");
    swatch.className = "mv_legend_swatch";
    swatch.style.background = color;
    a.appendChild(swatch);
    // Highlight quoted values (e.g. "IfcWindow") in the label text
    const textSpan = document.createElement("span");
    textSpan.className = "mv_legend_text";
    let last = 0;
    const re = /"([^"]*)"/g;
    let m;
    while ((m = re.exec(label)) !== null)
    {
      if (m.index > last)
        textSpan.appendChild(document.createTextNode(label.slice(last, m.index)));
      const mark = document.createElement("mark");
      mark.className = "mv_legend_val";
      mark.textContent = m[1]; // value without quotes
      textSpan.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < label.length)
      textSpan.appendChild(document.createTextNode(label.slice(last)));
    a.appendChild(textSpan);
    li.appendChild(a);
    return li;
  }

  _removeLegend()
  {
    this._legendPanel.visible = false;
  }

  _showFilterLegend(activeRules, ruleOp, findMatch, selectedClasses)
  {
    this._removeLegend();
    const app = this.application;
    const filtersText = this.application.i18n?.get("bim|mv.legend.filters");
    const titleText = activeRules.length > 1
      ? `${filtersText} (${ruleOp})`
      : (activeRules[0]
          ? (activeRules[0].nameInput?.value.trim() || activeRules[0].name || "Regla 1")
          : filtersText);
    const panel = this._createLegendPanel(titleText);
    const ul = document.createElement("ul");
    ul.className = "mv_legend_list";
    panel.bodyElem.appendChild(ul);

    // One block per rule (pack)
    activeRules.forEach((rule, rIdx) =>
    {
      // Clickable rule header
      const ruleName = rule.nameInput?.value.trim() || rule.name || `Regla ${rIdx + 1}`;
      const header = this._legendItem("#444444", ruleName);
      header.classList.add("mv_legend_group");
      header.title = this.application.i18n?.get("bim|mv.legend.select_all_pack");
      header.addEventListener("click", () =>
      {
        const objs = this._findObjects(obj =>
        {
          if (!obj.userData?.IFC?.GlobalId) return false;
          const cls = obj.userData?.IFC?.ifcClassName;
          if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
          if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
          // AND mode: object must satisfy all active rules (= what's actually visible)
          if (ruleOp === "AND") return !!findMatch(obj);
          // OR mode: object must satisfy this specific rule
          if (rule._format === "tree")
            return rule.stylizations.some(s => this._evalExpr(s.condition, obj));
          return rule.entries.some(e =>
            this._matchesRule(obj, rule.pset, rule.param, e.mode, e.value));
        });
        this._performLegendSelect(objs);
      });
      ul.appendChild(header);

      // ── Tree rule: sub-items — one per leaf condition inside the tree ────────
      if (rule._format === "tree")
      {
        const style  = rule._style || {};
        const action = style.action || "color";
        const i18n   = this.application.i18n;

        // Build swatch helper (shared visual style per action)
        const makeSwatch = () =>
        {
          const sw = document.createElement("span");
          sw.className = "mv_legend_swatch";
          if (action === "color") sw.style.background = style.color || "#888";
          else if (action === "transparent") sw.style.background = "repeating-linear-gradient(45deg,#ccc 0,#ccc 3px,#fff 3px,#fff 6px)";
          else if (action === "hide") { sw.style.background = "#333"; sw.textContent = "✕"; sw.style.color = "#fff"; sw.style.fontSize = "9px"; }
          else { sw.style.border = "2px dashed #aaa"; sw.textContent = "👁"; sw.style.fontSize = "9px"; }
          return sw;
        };

        // Recursively collect LEAF nodes from an ExprNode tree.
        // Used to create one legend sub-item per leaf condition.
        const collectLeaves = node =>
        {
          if (!node) return [];
          if (node.type === "LEAF") return [node];
          return (node.args || []).flatMap(collectLeaves);
        };

        // Use the snapshot condition (rule.stylizations[0].condition) produced by _readTreeNode()
        // at _apply() time. Contains current DOM values as plain fields, safe for _evalExpr().
        // NEVER use rule.conditionNode here — its plain fields (pset/param/etc.) are STALE.
        const snapshotNode = rule.stylizations[0]?.condition;
        // Special case: NOT(leaf) → leaf decomposition gives [leaf] → condition becomes NOT(leaf) AND leaf = ∅.
        // Skip sub-item decomposition for NOT roots; fall back to a single full-rule legend item.
        const leaves = (snapshotNode && snapshotNode.type !== "NOT")
          ? collectLeaves(snapshotNode)
          : [];
        const actionLabel = i18n?.get(`bim|mv.action.${action}`) || action;

        if (leaves.length === 0)
        {
          // Fallback: single item showing action only
          const sub = document.createElement("li");
          sub.className = "mv_legend_subitem";
          const a = document.createElement("a"); a.href = "#";
          a.appendChild(makeSwatch());
          a.appendChild(document.createTextNode(actionLabel));
          a.addEventListener("click", e =>
          {
            e.preventDefault(); e.stopPropagation();
            const objs = this._findObjects(obj =>
            {
              if (!obj.userData?.IFC?.GlobalId) return false;
              const cls = obj.userData?.IFC?.ifcClassName;
              if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
              if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
              return rule.stylizations.some(s => this._evalExpr(s.condition, obj));
            });
            this._performLegendSelect(objs);
          });
          sub.appendChild(a);
          ul.appendChild(sub);
        }
        else
        {
          // One sub-item per leaf: shows "Pset.Param <mode> value → action"
          leaves.forEach(leaf =>
          {
            const condDesc = this._describeExpr(leaf);
            const label = `${condDesc} → ${actionLabel}`;
            const sub = document.createElement("li");
            sub.className = "mv_legend_subitem";
            const a = document.createElement("a"); a.href = "#";
            a.appendChild(makeSwatch());
            a.appendChild(document.createTextNode(label));
            a.addEventListener("click", e =>
            {
              e.preventDefault(); e.stopPropagation();
              const objs = this._findObjects(obj =>
              {
                if (!obj.userData?.IFC?.GlobalId) return false;
                const cls = obj.userData?.IFC?.ifcClassName;
                if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
                if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
                // Must match the full visible set AND this specific leaf condition.
                // AND mode: object must satisfy all rules (intersection = what's visible).
                // OR mode: object must satisfy this rule specifically.
                const fullMatch = ruleOp === "AND"
                  ? !!findMatch(obj)
                  : rule.stylizations.some(s => this._evalExpr(s.condition, obj));
                return fullMatch && this._evalExpr(leaf, obj);
              });
              this._performLegendSelect(objs);
            });
            sub.appendChild(a);
            ul.appendChild(sub);
          });
        }
        return; // skip flat entry sub-items for tree rules
      }

      // ── Flat rule: one sub-item per entry ────────────────────────────────
      rule.entries.forEach(entry =>
      {
        const action = entry.action || this._overrideToAction(entry.override);
        const condText = this._matchLabel(entry.mode, entry.value);
        const actionKey = `bim|mv.action.${action}`;
        const actionText = ` (${this.application.i18n?.get(actionKey) || action})`;

        const sub = document.createElement("li");
        sub.className = "mv_legend_subitem";
        const a = document.createElement("a");
        a.href = "#";

        const swatch = document.createElement("span");
        swatch.className = "mv_legend_swatch";
        if (action === "color")
        {
          swatch.style.background = entry.color;
        }
        else if (action === "transparent")
        {
          swatch.style.background = "repeating-linear-gradient(45deg,#ccc 0,#ccc 3px,#fff 3px,#fff 6px)";
          swatch.title = actionText;
        }
        else if (action === "hide")
        {
          swatch.style.background = "#333";
          swatch.textContent = "✕";
          swatch.style.color = "#fff";
          swatch.style.fontSize = "9px";
          swatch.style.lineHeight = "1";
          swatch.style.display = "flex";
          swatch.style.alignItems = "center";
          swatch.style.justifyContent = "center";
        }
        else // show
        {
          swatch.style.background = "transparent";
          swatch.style.border = "2px dashed #aaa";
          swatch.textContent = "👁";
          swatch.style.fontSize = "9px";
          swatch.style.lineHeight = "1";
          swatch.style.display = "flex";
          swatch.style.alignItems = "center";
          swatch.style.justifyContent = "center";
        }
        a.appendChild(swatch);
        a.appendChild(document.createTextNode(condText + (action !== "color" ? actionText : "")));
        a.addEventListener("click", e =>
        {
          e.preventDefault();
          e.stopPropagation();
          const objs = this._findObjects(obj =>
          {
            if (!obj.userData?.IFC?.GlobalId) return false;
            const cls = obj.userData?.IFC?.ifcClassName;
            if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
            if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
            // AND mode: must also satisfy all other rules
            if (ruleOp === "AND" && !findMatch(obj)) return false;
            return this._matchesRule(obj, rule.pset, rule.param, entry.mode, entry.value);
          });
          this._performLegendSelect(objs);
        });
        sub.appendChild(a);
        ul.appendChild(sub);
      });
    });

    // Item for objects that did not match any rule
    const noMatchLabel = this.application.i18n?.get("bim|mv.legend.no_match") || "✗ No match";
    const noMatchItem = this._legendItem("#888888", noMatchLabel);
    noMatchItem.addEventListener("click", () =>
    {
      const objs = this._findObjects(obj =>
      {
        if (!obj.userData?.IFC?.GlobalId) return false;
        const cls = obj.userData?.IFC?.ifcClassName;
        if (!cls || DEFAULT_EXCLUDED.has(cls)) return false;
        if (selectedClasses.size > 0 && !selectedClasses.has(cls)) return false;
        return !findMatch(obj);
      });
      this._performLegendSelect(objs);
    });
    ul.appendChild(noMatchItem);

  }

  _ruleLabel(rule)
  {
    // Tree-based rules: show IF <condition summary> → <action>
    if (rule._format === "tree")
    {
      const i18n   = this.application.i18n;
      const action = rule._style?.action || rule.actionSelect?.value || "color";
      const ifWord = i18n?.get("bim|mv.styl.if") || "IF";
      const actionLabel = i18n?.get(`bim|mv.action.${action}`) || action;
      const condDesc = rule.conditionNode
        ? this._describeExpr(rule.conditionNode)
        : (i18n?.get("bim|mv.legend.rule_label") || "Rule");
      return `${ifWord} ${condDesc} → ${actionLabel}`;
    }
    const psetLbl = this._psetLabel(rule.pset);
    const paramPart = !SPECIAL_PSET_VALUES.has(rule.pset) && rule.param && rule.param !== "__auto__"
      ? `.${rule.param}`
      : "";
    return psetLbl + paramPart;
  }

  // ─── Configuracions guardades ────────────────────────────────────────────

  _currentConfig()
  {
    return {
      classes:    this._getSelectedClasses(),
      pset:       this.psetSelect.value,
      param:      this.paramSelect.value,
      lgPset:     this.lgPsetSelect.value,
      lgParam:    this.lgParamSelect.value,
      ruleOp:     this.ruleOpSelect.value,
      rules:      this._rules.map(r =>
      {
        // ── Tree-based stylization (Phase 3) ────────────────────────────
        if (r._format === "tree")
        {
          const condition = this._readTreeNode(r.conditionNode);
          const style     = this._readStylizationStyle(r);
          // _format:"tree" is the reliable sentinel used by _loadConfig() to re-detect
          // this as a tree stylization even when condition is null (empty tree).
          // Backward-compat: old versions will see entries:[] and import nothing (safe).
          // "name" is the user-supplied label from the rule name input; restored on import
          // by _addStylization(data) via `if (data.name) rule.nameInput.value = data.name`.
          const name = r.nameInput?.value.trim() || "";
          return { _format: "tree", condition, style, name, pset: null, param: null, entries: [] };
        }
        // ── Flat-entry rule (backward-compat) ─────────────────────────
        const pset  = r.psetSelect.value;
        const param = r.paramSelect.value;
        const entries = r.entries.map(e => ({
          op:          e.opSelect?.value ?? null,
          match:       e.matchSelect.value,
          value:       e.valueInput.value.trim(),
          action:      e.actionSelect.value,
          color:       e.colorInput.value,
          opacityMode: e.opacityModeSelect.value,
          opacity:     parseFloat(e.opacityInput.value),
          opacityPset: e.opacityPsetInput.value.trim(),
          opacityParam: e.opacityParamInput.value.trim(),
        }));
        const enriched = entries.map(e => ({ ...e, pset, param }));
        return { pset, param, entries, stylizations: this._ruleToStylizations(enriched) };
      }),
      mode:       this._modeValue,
      othersMode: this.othersSelect.value,
    };
  }

  _saveConfig()
  {
    const name = this.configNameInput?.value.trim();
    if (!name) return;
    const cfg = this._currentConfig();
    cfg.name = name;
    cfg.savedAt = new Date().toISOString();
    const configs = this._getConfigs().filter(c => c.name !== cfg.name);
    configs.push(cfg);
    this._setConfigs(configs);
    this._renderConfigList();
  }

  _loadConfig(cfg)
  {
    this._ensureScanned();
    this._toggleAllClasses(false);
    const clsSet = new Set(cfg.classes || []);
    if (clsSet.size === 0)
      this._toggleAllClasses(true);
    else
      this.classListElem.querySelectorAll("input[data-cls]").forEach(cb =>
      {
        if (clsSet.has(cb.dataset.cls)) cb.checked = true;
      });

    if (cfg.pset && [...this.psetSelect.options].some(o => o.value === cfg.pset))
    {
      this.psetSelect.value = cfg.pset;
      this._onPsetChange();
    }
    else if (!cfg.pset && cfg.param)
    {
      // No specific pset — find the first pset in the model that has this param
      const found = [...this.psetSelect.options].find(o =>
        o.value && this._modelPsets[o.value]?.includes(cfg.param)
      );
      if (found)
      {
        this.psetSelect.value = found.value;
        this._onPsetChange();
      }
    }
    if (cfg.param && [...this.paramSelect.options].some(o => o.value === cfg.param))
      this.paramSelect.value = cfg.param;

    if (cfg.lgPset && [...this.lgPsetSelect.options].some(o => o.value === cfg.lgPset))
    {
      this.lgPsetSelect.value = cfg.lgPset;
      this._onLgPsetChange();
      if (cfg.lgParam && [...this.lgParamSelect.options].some(o => o.value === cfg.lgParam))
        this.lgParamSelect.value = cfg.lgParam;
    }

    if (cfg.mode) { this._setMode(cfg.mode); }
    if (cfg.ruleOp) this.ruleOpSelect.value = cfg.ruleOp;
    [...this._rules].forEach(r => this._removeRule(r));

    const rulesData = cfg.rules ?? this._legacyRules(cfg);
    // Detect format: tree rules have _format:"tree" (new) or a truthy `condition` key (old saves).
    // Using `_format` is reliable even when condition is null (empty tree).
    // `r.condition` check handles configs saved before _format was added (backward-compat).
    rulesData.forEach(r =>
    {
      if (r._format === "tree" || r.condition) this._addStylization(r);
      else                                     this._addRule(r);
    });

    if (cfg.othersMode) this.othersSelect.value = cfg.othersMode;
  }

  _legacyRules(cfg)
  {
    // Compatibilitat amb configuracions antigues
    const rules = [];
    const v1 = cfg.rule1Value || cfg.valueFilter;
    if (v1) rules.push({
      pset: cfg.pset, param: cfg.param,
      entries: [{ match: cfg.rule1Match || "exact", value: v1, color: "#2ca02c", override: "normal" }]
    });
    if (cfg.rule2Value) rules.push({
      pset: cfg.rule2Pset, param: cfg.rule2Param,
      entries: [{ match: cfg.rule2Match || "exact", value: cfg.rule2Value, color: "#d62728", override: "normal" }]
    });
    return rules;
  }

  _renderConfigList()
  {
    if (!this.configListElem) return;
    const configs = this._getConfigs();
    this.configListElem.innerHTML = "";

    if (configs.length === 0)
    {
      const empty = document.createElement("div");
      empty.className = "mv_config_empty";
      I18N.set(empty, "textContent", "bim|mv.config.no_saved");
      this.configListElem.appendChild(empty);
      this.application.i18n?.update(empty);
      return;
    }

    configs.forEach(cfg =>
    {
      const item = document.createElement("div");
      item.className = "mv_config_item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "mv_config_name";
      nameSpan.textContent = cfg.name;
      nameSpan.title = cfg.name;
      item.appendChild(nameSpan);

      const actions = document.createElement("div");
      actions.className = "mv_config_actions";

      const loadBtn = document.createElement("button");
      loadBtn.className = "mv_btn mv_primary";
      loadBtn.textContent = "▶";
      I18N.set(loadBtn, "title", "bim|mv.btn.load_config");
      loadBtn.addEventListener("click", () =>
      {
        this._loadConfig(cfg);
        if (this.configNameInput) this.configNameInput.value = cfg.name;
        this._apply();
      });
      actions.appendChild(loadBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "mv_btn mv_danger";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () =>
      {
        const all = this._getConfigs().filter(c => c.name !== cfg.name);
        this._setConfigs(all);
        this._renderConfigList();
      });
      actions.appendChild(delBtn);

      item.appendChild(actions);
      this.configListElem.appendChild(item);
    });

    this.application.i18n?.updateTree(this.configListElem);
  }

  _getConfigs()
  {
    try { return JSON.parse(localStorage.getItem("mv_configs") || "[]"); }
    catch { return []; }
  }

  _setConfigs(configs)
  {
    localStorage.setItem("mv_configs", JSON.stringify(configs));
  }

  _exportAsScript()
  {
    const name = this.configNameInput?.value.trim() || "model-validation";
    const code = this._buildScriptCode();
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.endsWith(".js") ? name : name + ".js";
    a.click();
    URL.revokeObjectURL(url);
  }

  _buildScriptCode()
  {
    const cfg = this._currentConfig();
    const lines = [];

    const excludedList = JSON.stringify([...DEFAULT_EXCLUDED]);
    const classList = JSON.stringify(cfg.classes || []);

    const name = this.configNameInput?.value.trim() || "model-validation";
    cfg.name = name;
    lines.push(`// @sv-config: ${JSON.stringify(cfg)}`);
    lines.push(`// Model View: ${name}`);
    lines.push(`// Generated by BimRocket - Model View`);
    lines.push(``);
    lines.push(`const _sv_excluded = new Set(${excludedList});`);
    lines.push(`const _sv_classes = new Set(${classList});`);
    lines.push(``);
    lines.push(`function _sv_inScope($) {`);
    lines.push(`  const cls = $("IFC", "ifcClassName");`);
    lines.push(`  if (!cls || _sv_excluded.has(cls)) return false;`);
    lines.push(`  if (_sv_classes.size > 0 && !_sv_classes.has(cls)) return false;`);
    lines.push(`  return true;`);
    lines.push(`}`);
    lines.push(``);

    if (cfg.mode === "filter" && cfg.rules?.length > 0)
    {
      for (const rule of cfg.rules)
      {
        if (rule.condition)
        {
          const style = rule.style || {};
          const action = style.action || "color";
          const condExpr = this._conditionToScriptExpr(rule.condition);

          if (action === "hide")
          {
            lines.push(`// Hidden rule: ${condExpr}`);
          }
          else if (action === "show")
          {
            lines.push(`// Show rule (no visual change): ${condExpr}`);
          }
          else if (action === "color")
          {
            lines.push(`bimrocket.updateAppearance($ => {`);
            lines.push(`  if (!_sv_inScope($)) return false;`);
            lines.push(`  return ${condExpr};`);
            lines.push(`}, {`);
            lines.push(`  meshMaterial: { color: "${style.color || "#1f77b4"}", transparent: false, opacity: 1, depthWrite: true }`);
            lines.push(`});`);
            lines.push(``);
          }
          else if (action === "transparent")
          {
            const opacityExpr = style.opacityMode === "property"
              ? `($("${style.opacityPset}", "${style.opacityParam}") ?? 0.3)`
              : String(isNaN(style.opacity) ? 0.3 : style.opacity);
            lines.push(`bimrocket.updateAppearance($ => {`);
            lines.push(`  if (!_sv_inScope($)) return false;`);
            lines.push(`  return ${condExpr};`);
            lines.push(`}, { meshOpacity: ${opacityExpr} });`);
            lines.push(``);
          }
          continue;
        }
        if (!rule.entries?.length) continue;
        for (const entry of rule.entries)
        {
          const action = entry.action || this._overrideToAction(entry.override);
          const cond = this._entryToScriptCondition(rule.pset, rule.param, entry.match, entry.value);

          if (action === "hide")
          {
            lines.push(`// Hidden rule: ${cond}`);
          }
          else if (action === "show")
          {
            lines.push(`// Show rule (no visual change): ${cond}`);
          }
          else if (action === "color")
          {
            lines.push(`bimrocket.updateAppearance($ => {`);
            lines.push(`  if (!_sv_inScope($)) return false;`);
            lines.push(`  return ${cond};`);
            lines.push(`}, {`);
            lines.push(`  meshMaterial: { color: "${entry.color}", transparent: false, opacity: 1, depthWrite: true }`);
            lines.push(`});`);
            lines.push(``);
          }
          else if (action === "transparent")
          {
            const opacityExpr = entry.opacityMode === "property"
              ? `($("${entry.opacityPset}", "${entry.opacityParam}") ?? 0.3)`
              : String(isNaN(entry.opacity) ? 0.3 : entry.opacity);
            lines.push(`bimrocket.updateAppearance($ => {`);
            lines.push(`  if (!_sv_inScope($)) return false;`);
            lines.push(`  return ${cond};`);
            lines.push(`}, { meshOpacity: ${opacityExpr} });`);
            lines.push(``);
          }
        }
      }
    }
    else
    {
      const pset  = cfg.pset;
      const param = cfg.param;
      if (SPECIAL_PSET_VALUES.has(pset))
      {
        // Color assignment handled by the self-apply block at the end of the script
      }
      else
      {
        const paletteStr = JSON.stringify(COLOR_PALETTE);
        lines.push(`const _sv_pset  = ${JSON.stringify(pset)};`);
        lines.push(`const _sv_param = ${JSON.stringify(param)};`);
        lines.push(`const _sv_palette = ${paletteStr};`);
        lines.push(``);
        lines.push(`// Collect unique values`);
        lines.push(`const _sv_values = new Set();`);
        lines.push(`bimrocket.baseObject.traverse(function(obj) {`);
        lines.push(`  const ud = obj.userData;`);
        lines.push(`  if (!ud || !ud.IFC || !ud.IFC.GlobalId) return;`);
        lines.push(`  const cls = ud.IFC.ifcClassName;`);
        lines.push(`  if (!cls || _sv_excluded.has(cls)) return;`);
        lines.push(`  if (_sv_classes.size > 0 && !_sv_classes.has(cls)) return;`);
        lines.push(`  const v = ud[_sv_pset] && ud[_sv_pset][_sv_param];`);
        lines.push(`  if (v != null && String(v).trim() !== "") _sv_values.add(String(v).trim());`);
        lines.push(`});`);
        lines.push(``);
        lines.push(`const _sv_valueList = Array.from(_sv_values).sort();`);
        lines.push(`const _sv_colorMap = {};`);
        lines.push(`_sv_valueList.forEach((v, i) => _sv_colorMap[v] = _sv_palette[i % _sv_palette.length]);`);
        lines.push(``);
        lines.push(`_sv_valueList.forEach(val => {`);
        lines.push(`  bimrocket.updateAppearance($ => {`);
        lines.push(`    const cls = $("IFC", "ifcClassName");`);
        lines.push(`    if (!cls || _sv_excluded.has(cls)) return false;`);
        lines.push(`    if (_sv_classes.size > 0 && !_sv_classes.has(cls)) return false;`);
        lines.push(`    return $(_sv_pset, _sv_param) === val;`);
        lines.push(`  }, {`);
        lines.push(`    meshMaterial: { color: _sv_colorMap[val], transparent: false, opacity: 1, depthWrite: true }`);
        lines.push(`  });`);
        lines.push(`});`);
      }
    }

    // Self-apply when run directly from ScriptTool (Programes)
    lines.push(``);
    lines.push(`// Self-apply when run from ScriptTool`);
    lines.push(`(function() {`);
    lines.push(`  if (typeof bimrocket === 'undefined') return;`);
    lines.push(`  const _svTool = bimrocket.tools?.model_validation;`);
    lines.push(`  if (!_svTool) return;`);
    lines.push(`  const _svPanel = _svTool.panel;`);
    lines.push(`  if (!_svPanel) return;`);
    lines.push(`  const _svCfg = ${JSON.stringify(cfg)};`);
    lines.push(`  _svPanel._loadConfig(_svCfg);`);
    lines.push(`  _svPanel._apply();`);
    lines.push(`  if (_svTool.vanillaMenu && !_svTool.vanillaMenu.config.isOpen)`);
    lines.push(`    _svTool.vanillaMenu.open();`);
    lines.push(`})();`);

    return lines.join("\n");
  }

  _entryToScriptCondition(pset, param, mode, value)
  {
    if (SPECIAL_PSET_VALUES.has(pset)) return `true /* ${pset} — edit manually */`;
    const acc = `$(${JSON.stringify(pset)}, ${JSON.stringify(param)})`;
    const vLow = JSON.stringify((value || "").toLowerCase());
    switch (mode)
    {
      case "exact":        return `${acc} === ${JSON.stringify(value)}`;
      case "contains":     return `(${acc} || "").toLowerCase().includes(${vLow})`;
      case "starts":       return `(${acc} || "").toLowerCase().startsWith(${vLow})`;
      case "ends":         return `(${acc} || "").toLowerCase().endsWith(${vLow})`;
      case "not_exact":    return `${acc} !== ${JSON.stringify(value)}`;
      case "not_contains": return `!(${acc} || "").toLowerCase().includes(${vLow})`;
      case "not_starts":   return `!(${acc} || "").toLowerCase().startsWith(${vLow})`;
      case "not_ends":     return `!(${acc} || "").toLowerCase().endsWith(${vLow})`;
      case "gt":           return `parseFloat(${acc}) >  ${parseFloat(value)}`;
      case "gte":          return `parseFloat(${acc}) >= ${parseFloat(value)}`;
      case "lt":           return `parseFloat(${acc}) <  ${parseFloat(value)}`;
      case "lte":          return `parseFloat(${acc}) <= ${parseFloat(value)}`;
      case "has_param":    return `${acc} != null`;
      case "no_param":     return `${acc} == null`;
      case "has_value":    return `${acc} != null && String(${acc}).trim() !== ""`;
      case "no_value":     return `(${acc} == null || String(${acc}).trim() === "")`;
      default:             return `${acc} === ${JSON.stringify(value)}`;
    }
  }

  /**
   * Translate a plain ExprNode snapshot to a JS boolean expression string.
   * The $ accessor is the same one used in bimrocket.updateAppearance() callbacks.
   */
  _conditionToScriptExpr(node)
  {
    if (!node) return "false";
    switch (node.type)
    {
      case "AND":
        if (!node.args?.length) return "false";
        return node.args.map(a => `(${this._conditionToScriptExpr(a)})`).join(" && ");
      case "OR":
        if (!node.args?.length) return "false";
        return node.args.map(a => `(${this._conditionToScriptExpr(a)})`).join(" || ");
      case "NOT":
        return `!(${this._conditionToScriptExpr(node.args?.[0])})`;
      case "LITERAL":
        return JSON.stringify(Boolean(node.value));
      case "LEAF":
        return this._entryToScriptCondition(node.pset, node.param, node.mode, node.value);
      case "EQUAL":
      {
        const [a, b] = node.args || [];
        return `String(${this._valueNodeToExpr(a)}) === String(${this._valueNodeToExpr(b)})`;
      }
      case "NOT_EQUAL":
      {
        const [a, b] = node.args || [];
        return `String(${this._valueNodeToExpr(a)}) !== String(${this._valueNodeToExpr(b)})`;
      }
      case "GT":
      {
        const [a, b] = node.args || [];
        return `parseFloat(${this._valueNodeToExpr(a)}) > parseFloat(${this._valueNodeToExpr(b)})`;
      }
      case "GTE":
      {
        const [a, b] = node.args || [];
        return `parseFloat(${this._valueNodeToExpr(a)}) >= parseFloat(${this._valueNodeToExpr(b)})`;
      }
      case "LT":
      {
        const [a, b] = node.args || [];
        return `parseFloat(${this._valueNodeToExpr(a)}) < parseFloat(${this._valueNodeToExpr(b)})`;
      }
      case "LTE":
      {
        const [a, b] = node.args || [];
        return `parseFloat(${this._valueNodeToExpr(a)}) <= parseFloat(${this._valueNodeToExpr(b)})`;
      }
      case "CONTAINS":
      {
        const [a, b] = node.args || [];
        return `String(${this._valueNodeToExpr(a)}).includes(String(${this._valueNodeToExpr(b)}))`;
      }
      case "IN":
      {
        const [prop, ...literals] = node.args || [];
        const propExpr = this._valueNodeToExpr(prop);
        return `[${literals.map(l => JSON.stringify(this._evalValueNode(l))).join(", ")}].includes(String(${propExpr}))`;
      }
      case "BETWEEN":
      {
        const [prop, lo, hi] = node.args || [];
        const propExpr = `parseFloat(${this._valueNodeToExpr(prop)})`;
        return `(${propExpr} >= ${this._valueNodeToExpr(lo)} && ${propExpr} <= ${this._valueNodeToExpr(hi)})`;
      }
      default:
        return "false";
    }
  }

  _valueNodeToExpr(node)
  {
    if (!node) return "null";
    if (node.type === "PROPERTY") return `$(${JSON.stringify(node.group)}, ${JSON.stringify(node.name)})`;
    if (node.type === "LITERAL")  return JSON.stringify(node.value);
    return "null";
  }

  _evalValueNode(node)
  {
    if (!node) return null;
    if (node.type === "LITERAL") return node.value;
    return null;
  }

  _importConfig()
  {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*";
    input.multiple = true;
    input.addEventListener("change", () =>
    {
      const files = [...input.files];
      const applyOnLoad = files.length === 1;
      files.forEach(file =>
      {
        const reader = new FileReader();
        reader.onload = e => this._importContent(e.target.result, file.name, applyOnLoad);
        reader.readAsText(file);
      });
    });
    input.click();
  }

  _importContent(text, fileName, applyOnLoad = true)
  {
    // Try to recover a config from the script — three tiers:
    // 1. @sv-config JSON comment (scripts saved from this panel)
    // 2. Parse known _sv_* variable patterns (old SmartView exports)
    // 3. No recognisable metadata → skip panel restore
    const cfg = this._extractConfigFromScript(text, fileName);
    if (!cfg) return;

    // Auto-scan if model loaded but not yet scanned
    this._ensureScanned();

    // File name always takes priority over the internal config name
    if (fileName)
      cfg.name = fileName.replace(/\.[^.]+$/, "");

    this._loadConfig(cfg);
    if (this.configNameInput) this.configNameInput.value = cfg.name || "";

    if (cfg.name)
    {
      const all = this._getConfigs().filter(c => c.name !== cfg.name);
      all.push(cfg);
      this._setConfigs(all);
      this._renderConfigList();
    }

    // Warn about elements in the config that are absent from this model
    this._warnMissingConfigElements(cfg);

    // Re-apply via panel so legend appears and state is consistent
    if (applyOnLoad) this._apply();
  }

  _warnMissingConfigElements(cfg)
  {
    const missing = [];

    // Classes requested but not present in model
    if (cfg.classes?.length)
    {
      const availableClasses = new Set(
        [...this.classListElem.querySelectorAll("input[data-cls]")].map(cb => cb.dataset.cls)
      );
      const missingClasses = cfg.classes.filter(c => !availableClasses.has(c));
      if (missingClasses.length)
        missing.push("Classes: " + missingClasses.join(", "));
    }

    // Pset requested but not scanned in model
    if (cfg.pset && !SPECIAL_PSET_VALUES.has(cfg.pset))
    {
      const psetExists = [...this.psetSelect.options].some(o => o.value === cfg.pset);
      if (!psetExists)
      {
        missing.push("Pset: " + cfg.pset);
        // Add temporary option so _apply() can run with the right pset
        // (will find no values → legend empty for this property, but panel state is correct)
        const opt = document.createElement("option");
        opt.value = cfg.pset;
        opt.textContent = cfg.pset + " (*)";
        opt.dataset.temporary = "1";
        this.psetSelect.appendChild(opt);
        this.psetSelect.value = cfg.pset;
        this._onPsetChange();
        // Also inject param if needed
        if (cfg.param)
        {
          const paramExists = [...this.paramSelect.options].some(o => o.value === cfg.param);
          if (!paramExists)
          {
            const popt = document.createElement("option");
            popt.value = cfg.param;
            popt.textContent = cfg.param + " (*)";
            popt.dataset.temporary = "1";
            this.paramSelect.appendChild(popt);
            this.paramSelect.value = cfg.param;
            missing.push("Param: " + cfg.param);
          }
        }
      }
      else if (cfg.param)
      {
        const paramExists = [...this.paramSelect.options].some(o => o.value === cfg.param);
        if (!paramExists)
          missing.push("Param: " + cfg.param);
      }
    }

    if (missing.length)
    {
      const msg = "⚠ Script carregat. Alguns elements no existeixen en aquest model: " + missing.join(", ");
      this._showPanelWarning(msg);
    }
  }

  _showPanelWarning(msg)
  {
    this._clearPanelWarning();
    const banner = document.createElement("div");
    banner.id = "mv_panel_warning";
    banner.className = "mv_panel_warning";
    banner.textContent = msg;
    const close = document.createElement("button");
    close.className = "mv_panel_warning_close";
    close.textContent = "✕";
    close.addEventListener("click", () => this._clearPanelWarning());
    banner.appendChild(close);
    this.bodyElem.insertBefore(banner, this.bodyElem.firstChild);
  }

  _clearPanelWarning()
  {
    document.getElementById("mv_panel_warning")?.remove();
  }

  /**
   * Try to extract a SmartView config object from a JS script string.
   * Returns null if the script has no recognisable metadata.
   *
   * Tier 1 — @sv-config JSON comment  (scripts saved from this panel, new format)
   * Tier 2 — _sv_* variable patterns  (old SmartView exports)
   * Tier 3 — Programes script patterns (PSET_NAME/PARAM_NAME constants,
   *           bimrocket.updateAppearance calls, palette arrays, etc.)
   */
  _extractConfigFromScript(text, fileName)
  {
    // ── Tier 1: embedded JSON ─────────────────────────────────────────────
    for (const line of text.split("\n"))
    {
      const m = line.match(/^\/\/ @sv-config: (.+)$/);
      if (m)
      {
        try { return JSON.parse(m[1].trim()); }
        catch { break; }
      }
    }

    // ── Tier 2: _sv_* variable patterns (old SmartView exports) ──────────
    const nameMatch        = text.match(/\/\/ SmartView:\s*(.+)/);
    const svPsetMatch      = text.match(/const _sv_pset\s*=\s*"([^"]+)"/);
    const svParamMatch     = text.match(/const _sv_param\s*=\s*"([^"]+)"/);
    const svClsMatch       = text.match(/const _sv_classes\s*=\s*new Set\((\[.*?\])\)/s);
    const specialPsetMatch = text.match(/\/\/ Note: special property '([^']+)'/);

    if (nameMatch || svPsetMatch || svParamMatch || svClsMatch)
    {
      const cfg = {};
      if (fileName)              cfg.name  = fileName.replace(/\.[^.]+$/, "");
      else if (nameMatch)        cfg.name  = nameMatch[1].trim();
      if (svPsetMatch)           cfg.pset  = svPsetMatch[1];
      else if (specialPsetMatch) cfg.pset  = specialPsetMatch[1];
      if (svParamMatch)          cfg.param = svParamMatch[1];
      if (svClsMatch)
      {
        try { cfg.classes = JSON.parse(svClsMatch[1]); }
        catch { cfg.classes = []; }
      }
      cfg.mode = text.includes("_sv_palette") ? "color" : "filter";
      if (cfg.mode === "filter")
        cfg.rules = this._extractFilterRulesFromScript(text, cfg.pset || "", cfg.param || "");
      return cfg;
    }

    // ── Tier 3: Programes script patterns ────────────────────────────────
    // Only attempt if the script uses bimrocket.updateAppearance (visual script)
    if (!text.includes("bimrocket.updateAppearance")) return null;

    const cfg = { name: fileName ? fileName.replace(/\.[^.]+$/, "") : null };
    if (!cfg.name) return null;

    // Detect pset/param from common Programes naming conventions
    const psetNameMatch  = text.match(/const PSET_NAME\s*=\s*"([^"]+)"/);
    const paramNameMatch = text.match(/const PARAM_NAME\s*=\s*"([^"]+)"/);
    // Multi-pset scripts: PSET_CODIGO is the primary subject pset
    const psetCodMatch   = text.match(/const PSET_CODIGO\s*=\s*"([^"]+)"/);
    const paramCodMatch  = text.match(/const PARAM_CODIGO\s*=\s*"([^"]+)"/);
    // Inline pset refs inside $() calls as fallback: $("Pset_...", "param")
    // Skip infrastructure keys: "IFC", "type", "name", "parent", "id"
    const INFRA_KEYS = new Set(["IFC", "type", "name", "parent", "id"]);
    const inlinePsetMatch = [...text.matchAll(/\$\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g)]
      .find(m => !INFRA_KEYS.has(m[1]));

    if (psetNameMatch)       { cfg.pset  = psetNameMatch[1];  }
    else if (psetCodMatch)   { cfg.pset  = psetCodMatch[1];   }
    else if (inlinePsetMatch){ cfg.pset  = inlinePsetMatch[1]; }

    if (paramNameMatch)      { cfg.param = paramNameMatch[1]; }
    else if (paramCodMatch)  { cfg.param = paramCodMatch[1];  }
    else if (inlinePsetMatch){ cfg.param = inlinePsetMatch[2]; }

    // Detect custom cross-pset helper: function getXxx($) { for (const pset in ud) ... ud[pset]?.Xxx }
    // These helpers search all psets for a property — take the property name as param.
    const customHelperM = text.match(/function\s+get(\w+)\s*\(\$\)[\s\S]{0,400}?for\s*\(const\s+\w+\s+in\s+ud\)[\s\S]{0,200}?\[pset\]\?\.([\w]+)/);
    if (customHelperM && !cfg.pset)
    {
      cfg.param = customHelperM[2] || customHelperM[1];
      // No specific pset — leave undefined so SmartView shows all available psets
    }

    // Detect ifcClassName coloring: uses $("IFC","ifcClassName") without a real pset/helper
    const usesIfcClass = /\$\(\s*["']IFC["']\s*,\s*["']ifcClassName["']\s*\)/.test(text)
                      && !cfg.pset && !customHelperM;
    if (usesIfcClass) cfg.pset = "__ifcClass__";

    // Detect color mode vs filter mode
    // Color mode: script collects unique values then loops → palette/colorMap present
    // Filter mode: script has fixed color assignments with specific conditions
    const hasColorMap = /colorMap|colormap|palette/i.test(text)
                     && /forEach|for\s*\(/.test(text);
    cfg.mode = hasColorMap ? "color" : "filter";

    if (cfg.mode === "filter")
      cfg.rules = this._extractFilterRulesFromScript(text, cfg.pset || "", cfg.param || "");

    cfg.showLegend = true;
    return cfg;
  }

  /**
   * Extract filter rule entries from bimrocket.updateAppearance calls in a script.
   * All color blocks targeting the same param are merged into ONE rule with multiple
   * entries — matching how SmartViews represents multi-value conditions.
   *
   * NOTE: This parser handles simple conditions (===, startsWith, == null...) written by hand.
   * Complex AND/OR trees written manually will not be reconstructed as tree rules in the panel.
   * This is intentional and acceptable — the expected flow is panel → Programes (export),
   * not Programes → panel (reverse). Scripts with @sv-config: (exported by this panel) always
   * round-trip correctly via Tier 1 parsing regardless of condition complexity.
   */
  _extractFilterRulesFromScript(text, pset, param)
  {
    const entries = [];

    // Match: bimrocket.updateAppearance(cond, { ...any... meshMaterial: { color: "#HEX" ... } })
    // meshMaterial may not be the first key in the options object.
    const blockRe = /bimrocket\.updateAppearance\(\s*([\s\S]+?)\s*,\s*\{[^{]*?meshMaterial\s*:\s*\{[^}]*color\s*:\s*["'](#[0-9a-fA-F]{3,8})["'][^}]*\}/g;
    let bm;
    while ((bm = blockRe.exec(text)) !== null)
    {
      const rawName = bm[1].trim();
      const color   = bm[2];

      let matchMode = "exact";
      let value     = "";

      // 1. Variable name hints — most reliable for named conditions
      if (/[Nn]o[_]?[Pp]aram|NullParam|nullparam/i.test(rawName))
      {
        matchMode = "no_param";
      }
      else if (/[Nn]o[_]?[Vv]alue|NullValue|nullvalue/i.test(rawName))
      {
        matchMode = "no_value";
      }
      else if (/[Tt]rue[_$]?$|_[Tt]rue$|[Ii]s[Tt]rue/i.test(rawName))
      {
        matchMode = "exact"; value = "true";
      }
      else if (/[Ff]alse[_$]?$|_[Ff]alse$|[Ii]s[Ff]alse/i.test(rawName))
      {
        matchMode = "exact"; value = "false";
      }
      else
      {
        // 2. Look up variable definition (inline lambda) if rawName is a simple identifier
        let condExpr = rawName;
        if (/^\w+$/.test(rawName))
        {
          const defRe = new RegExp(
            `(?:const|let|var)\\s+${rawName}\\s*=\\s*\\$\\s*=>\\s*([\\s\\S]+?)(?=;\\s*(?:const|let|var|function|bimrocket)|$)`
          );
          const defM = text.match(defRe);
          if (defM) condExpr = defM[1];
        }

        // 3. Analyse condition expression
        const startsM  = condExpr.match(/\.startsWith\(\s*["']([^"']+)["']\s*\)/);
        // Look for === "value" but skip infrastructure checks like $("type") === "Object3D"
        const exactAll = [...condExpr.matchAll(/===\s*["']([^"']+)["']/g)];
        const exactM   = exactAll.find(m => m[1] !== "Object3D" && !m[1].startsWith("Ifc"));
        const noParamM = /===\s*undefined|==\s*null(?!\s*[|&])/.test(condExpr)
                      && !/!==\s*undefined|!=\s*null/.test(condExpr);
        const noValueM = noParamM && /["']["']|trim\(\)/.test(condExpr);

        if (startsM)       { matchMode = "starts";   value = startsM[1];  }
        else if (exactM)   { matchMode = "exact";    value = exactM[1];   }
        else if (noValueM) { matchMode = "no_value"; }
        else if (noParamM) { matchMode = "no_param"; }
      }

      entries.push({ match: matchMode, value, color, override: "color" });
    }

    return entries.length > 0 ? [{ pset, param, entries }] : [];
  }

  // ── Action panel toggle (Save / Open dropdown) ───────────────────────────

  _toggleActionPanel(which)
  {
    const isOpen = which === "open";
    const panel = isOpen ? this._openOptionsPanel : this._saveOptionsPanel;
    const other = isOpen ? this._saveOptionsPanel : this._openOptionsPanel;
    other.style.display = "none";
    const opening = panel.style.display === "none";
    panel.style.display = opening ? "" : "none";
    if (opening) this.application.i18n?.updateTree(panel);
  }

  _hideActionPanels()
  {
    if (this._saveOptionsPanel) this._saveOptionsPanel.style.display = "none";
    if (this._openOptionsPanel) this._openOptionsPanel.style.display = "none";
  }

  _executeSave(dest)
  {
    if (dest === "memory")
    {
      this._saveConfig();
    }
    else if (dest === "local")
    {
      this._exportAsScript();
    }
    else
    {
      this._saveToBimRocket();
    }
  }

  // ── BimRocket Programes integration ──────────────────────────────────────

  _openFromBimRocket()
  {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".js";
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

  _saveToBimRocket()
  {
    const application = this.application;
    const fileExplorer = this._sourceFileExplorer ||
      application.tools["cloud_explorer"]?.fileExplorer || null;

    // onSave set means panel was opened from FileExplorer (CreateSmartViewAction)
    const hasServerDest = typeof this.onSave === "function" ||
      fileExplorer?.isDirectoryList();

    const dialog = new Dialog("bim|mv.dialog.save_title");
    dialog.setSize(300, 175);
    dialog.setI18N(application.i18n);
    const nameElem = dialog.addTextField("mv_save_name", "bim|mv.dialog.file_name");
    nameElem.setAttribute("spellcheck", "false");
    nameElem.value = this.configNameInput?.value.trim() || "model-validation";

    const getBaseName = () =>
    {
      const raw = nameElem.value.trim() || "model-validation";
      return raw.endsWith(".js") ? raw : raw + ".js";
    };

    const saveLocal = (baseName, content) =>
    {
      const blob = new Blob([content], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = baseName;
      a.click();
      URL.revokeObjectURL(url);
    };

    const saveCloud = (baseName, content) =>
    {
      if (typeof this.onSave === "function")
      {
        // Opened from FileExplorer via CreateSmartViewAction
        this.onSave(baseName, content);
      }
      else if (fileExplorer?.isDirectoryList())
      {
        // FileExplorer already navigated to a folder
        fileExplorer.save(baseName, content);
      }
      else
      {
        // No active directory: store pending save and open FileExplorer
        fileExplorer._pendingModelValidationSave = { baseName, content };
        application.useTool(application.tools["cloud_explorer"]);
        Toast.create("bim|mv.toast.navigate_to_save")
          .setI18N(application.i18n).show();
      }
    };

    // Cloud save button: label shows destination path if known, fallback to i18n key
    const i18n = application.i18n;
    const saveTo = i18n?.get("bim|mv.btn.save_to");
    let destPath = null;
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
      : i18n?.get("bim|mv.btn.choose_folder");

    const cloudBtn = dialog.addButton("mv_save_cloud", cloudBtnLabel,
      () => { dialog.hide(); saveCloud(getBaseName(), this._buildScriptCode()); },
      hasServerDest ? "mv_primary" : "");
    // Prevent i18n updateTree from overwriting the dynamic label
    delete cloudBtn.i18n;
    // Full path as tooltip in case text is truncated
    if (destPath) cloudBtn.title = `${saveTo} ${destPath}`;

    // Local download button: always visible
    dialog.addButton("mv_save_local", "bim|mv.btn.save_local",
      () => { dialog.hide(); saveLocal(getBaseName(), this._buildScriptCode()); });

    dialog.addButton("mv_save_cancel", "button.cancel", () => dialog.hide());

    dialog.onShow = () => { nameElem.select(); nameElem.focus(); };
    dialog.show();
  }

  /**
   * Return black (#000) or white (#fff) for best contrast on a given background hex color.
   * Uses luminance formula: 0.299·R + 0.587·G + 0.114·B (ITU-R BT.601).
   */
  _contrastColor(hex)
  {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114) / 1000 > 128 ? "#000" : "#fff";
  }

  // ─── Utilitats ───────────────────────────────────────────────────────────

  /**
   * Find all scene objects matching a predicate.
   * Used by legend click handlers to gather objects to select/highlight.
   * Predicates should always guard with GlobalId, DEFAULT_EXCLUDED and selectedClasses checks.
   *
   * @param {Function} predicate - (THREE.Object3D) => boolean
   * @returns {Array<THREE.Object3D>}
   */
  _findObjects(predicate)
  {
    const result = [];
    this.application.baseObject?.traverse(obj =>
    {
      if (predicate(obj)) result.push(obj);
    });
    return result;
  }

  _createLegendPanel(title)
  {
    const panel = this._legendPanel;
    panel.bodyElem.innerHTML = "";
    // Show pset/param as a subtitle inside the body
    if (title)
    {
      const subtitle = document.createElement("div");
      subtitle.className = "mv_legend_subtitle";
      subtitle.textContent = title;
      panel.bodyElem.appendChild(subtitle);
    }
    panel.visible = true;
    panel.minimized = false;
    return panel;
  }

  _updateScanBtn()
  {
    if (!this._scanBtn) return;
    const hasModel = this.application.baseObject?.children?.length > 0;
    this._scanBtn.disabled = !hasModel;
    this._scanBtn.style.opacity = hasModel ? "" : "0.4";
    this._scanBtn.style.cursor  = hasModel ? "" : "not-allowed";
  }

  onShow()
  {
    this._updateScanBtn();
    if (this.application.i18n)
    {
      this.application.i18n.updateTree(this.element);
    }
  }
}

export { ModelValidationPanel };
