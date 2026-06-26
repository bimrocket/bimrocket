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
  "IfcBuildingStorey","IfcSite","IfcProject","IfcStairFlight","IfcSpace"
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

    // ── Section: IFC class filter
    this._section(body, "bim|mv.section.ifc_classes", s =>
    {
      const row = this._row(s);
      this._scanBtn = this._btn(row, "bim|mv.btn.scan", () => this._scanModel(), "mv_primary");
      const allNoneGroup = document.createElement("div");
      allNoneGroup.style.cssText = "display:flex;gap:4px;margin-left:auto;";
      row.appendChild(allNoneGroup);
      this._btn(allNoneGroup, "bim|mv.btn.all_classes",  () => this._toggleAllClasses(true));
      this._btn(allNoneGroup, "bim|mv.btn.none_classes", () => this._toggleAllClasses(false));

      this.classListElem = document.createElement("div");
      this.classListElem.className = "mv_class_list";
      s.appendChild(this.classListElem);
    }, true);

    // ── Section: coloring by parameter
    this._section(body, "bim|mv.section.coloring", s =>
    {
      // Mode selector (Colorar / Filtrar) — toggle buttons
      const modeRow = this._row(s);
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
      s.appendChild(this._groupBySection);

      // ─ Filter section (rules) ─
      this._filterSection = document.createElement("div");
      this._filterSection.style.display = "none";
      const rulesHeader = document.createElement("div");
      rulesHeader.className = "mv_rule2_header";
      I18N.set(rulesHeader, "textContent", "bim|mv.label.filter_rules");
      this._filterSection.appendChild(rulesHeader);

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
      this._btn(opAddRow, "bim|mv.btn.add_rule", () => this._addRule(), "mv_primary");
      this._filterSection.appendChild(opAddRow);

      this._rulesContainer = document.createElement("div");
      this._rulesContainer.className = "mv_rules_container";
      this._filterSection.appendChild(this._rulesContainer);
      s.appendChild(this._filterSection);

      // Initialize psets
      this._populatePsetDefaults();
    });

    // ── Section: options
    this._section(body, "bim|mv.section.options", s =>
    {
      const row = this._labeledRow(s, "bim|mv.label.others_mode");
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
      row.appendChild(this.othersSelect);
    });

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

  _scanModel()
  {
    const app = this.application;
    if (!app.baseObject) return;

    const classSet = new Set();
    const psetMap  = {};

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

      const uds = [ud];
      const typeUd = obj.links?.ifcType?.userData;
      if (typeUd) uds.push(typeUd);

      for (const src of uds)
      {
        for (const pset in src)
        {
          if (pset === "IFC" || typeof src[pset] !== "object") continue;
          if (!psetMap[pset]) psetMap[pset] = new Set();
          for (const param in src[pset])
          {
            if (!param.endsWith("_metadata")) psetMap[pset].add(param);
          }
        }
      }
    });

    this._modelClasses = Array.from(classSet).sort();
    this._modelPsets = {};
    for (const p in psetMap) this._modelPsets[p] = Array.from(psetMap[p]).sort();

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

    // Optgroup: property sets del model
    if (Object.keys(this._modelPsets).length > 0)
    {
      const psetGroup = document.createElement("optgroup");
      I18N.set(psetGroup, "label", "bim|mv.optgroup.psets");
      Object.keys(this._modelPsets).sort().forEach(pset =>
      {
        const opt = document.createElement("option");
        opt.value = pset;
        opt.textContent = pset;
        psetGroup.appendChild(opt);
      });
      sel.appendChild(psetGroup);
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
      const psetGroup = document.createElement("optgroup");
      I18N.set(psetGroup, "label", "bim|mv.optgroup.psets");
      Object.keys(this._modelPsets).sort().forEach(pset =>
      {
        const opt = document.createElement("option");
        opt.value = pset;
        opt.textContent = pset;
        psetGroup.appendChild(opt);
      });
      this.lgPsetSelect.appendChild(psetGroup);
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
    [...this._rulesContainer.querySelectorAll(".mv_rule_row")].forEach((row, i) =>
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

    // Match mode select
    entryData.matchSelect = this._matchModeSelect();
    entryRow.appendChild(entryData.matchSelect);

    // Value input
    entryData.valueInput = document.createElement("input");
    entryData.valueInput.type = "text";
    entryData.valueInput.className = "mv_input mv_entry_value";
    I18N.set(entryData.valueInput, "placeholder", "bim|mv.placeholder.value_filter");
    entryRow.appendChild(entryData.valueInput);

    // Color input (type=color)
    entryData.colorInput = document.createElement("input");
    entryData.colorInput.type = "color";
    entryData.colorInput.className = "mv_color_input";
    entryData.colorInput.value = data.color || COLOR_PALETTE[rule.entries.length % COLOR_PALETTE.length];
    entryRow.appendChild(entryData.colorInput);

    // Override select: Normal / Transparent / Hidden
    entryData.overrideSelect = document.createElement("select");
    entryData.overrideSelect.className = "mv_select mv_override_sel";
    [
      ["normal",      "bim|mv.override.normal"],
      ["transparent", "bim|mv.override.transparent"],
      ["hidden",      "bim|mv.override.hidden"]
    ].forEach(([val, key]) =>
    {
      const opt = document.createElement("option");
      opt.value = val;
      I18N.set(opt, "textContent", key);
      entryData.overrideSelect.appendChild(opt);
    });
    entryData.overrideSelect.value = data.override || "normal";
    entryRow.appendChild(entryData.overrideSelect);

    // Delete entry button
    const delEntry = document.createElement("button");
    delEntry.className = "mv_btn mv_danger mv_entry_del";
    delEntry.textContent = "✕";
    delEntry.addEventListener("click", () =>
    {
      rule.entries = rule.entries.filter(e => e !== entryData);
      entryRow.remove();
    });
    entryRow.appendChild(delEntry);

    // Restaurar dades
    if (data.match) entryData.matchSelect.value = data.match;
    if (data.value) entryData.valueInput.value = data.value;
    this._updateEntryValueVisibility(entryData);
    entryData.matchSelect.addEventListener("change", () => this._updateEntryValueVisibility(entryData));

    entryData.elem = entryRow;
    rule.entries.push(entryData);
    rule.entriesContainer.appendChild(entryRow);
    return entryData;
  }

  _updateEntryValueVisibility(entryData)
  {
    const noVal = NO_VALUE_MODES.has(entryData.matchSelect.value);
    entryData.valueInput.style.display = noVal ? "none" : "";
    entryData.valueInput.style.visibility = noVal ? "hidden" : "";
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
    const prev = rule.psetSelect.value;
    this._fillPsetSelect(rule.psetSelect);
    if (prev && [...rule.psetSelect.options].some(o => o.value === prev))
      rule.psetSelect.value = prev;
    this._onRulePsetChange(rule);
    this.application.i18n?.updateTree(rule.psetSelect);
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

    // Build active rules
    const activeRules = this._rules.map(r =>
    {
      const entries = r.entries.map(e => ({
        pset:     r.psetSelect.value,
        param:    r.paramSelect.value,
        mode:     e.matchSelect.value,
        value:    e.valueInput.value.trim(),
        color:    e.colorInput.value,
        override: e.overrideSelect.value,
      })).filter(e => e.value !== "" || NO_VALUE_MODES.has(e.mode));
      return { pset: r.psetSelect.value, param: r.paramSelect.value, entries };
    }).filter(r => r.entries.length > 0);

    const hasFilter = isFilterMode && activeRules.length > 0;

    const findMatch = obj =>
    {
      if (!hasFilter) return null;
      if (ruleOp === "AND")
      {
        let firstEntry = null;
        for (const rule of activeRules)
        {
          const entry = rule.entries.find(e =>
            this._matchesRule(obj, e.pset, e.param, e.mode, e.value));
          if (!entry) return null;
          if (!firstEntry) firstEntry = entry;
        }
        return firstEntry
          ? { color: firstEntry.color, override: firstEntry.override, mode: firstEntry.mode, value: firstEntry.value }
          : null;
      }
      else
      {
        for (const rule of activeRules)
        {
          const entry = rule.entries.find(e =>
            this._matchesRule(obj, e.pset, e.param, e.mode, e.value));
          if (entry) return { color: entry.color, override: entry.override, mode: entry.mode, value: entry.value };
        }
        return null;
      }
    };

    if (selectedClasses.size === 0 && this._modelClasses.length > 0) return;

    // 1. Collect unique values for the color-by-property legend
    const valueSet = new Set();
    app.baseObject.traverse(obj =>
    {
      const cls = obj.userData?.IFC?.ifcClassName;
      if (!cls || DEFAULT_EXCLUDED.has(cls)) return;
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
      if (DEFAULT_EXCLUDED.has(cls))
      {
        // Block color inheritance: excluded objects (IfcOpeningElement etc.) must not
        // inherit color from a colored parent (e.g. IfcWallStandardCase → IfcOpeningElement
        // would make the void geometry appear colored, confusing ray-picking with IfcDoor).
        if (obj.userData.IFC?.GlobalId) objectMaterialMap.set(obj, null);
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
          const { color, override } = match;
          if (override === "hidden")
          {
            this._hide(obj);
            objectMaterialMap.set(obj, null); // explicit null blocks inheritance to children
          }
          else if (override === "transparent") { objectMaterialMap.set(obj, getMat(color, 0.2)); }
          else                                 { objectMaterialMap.set(obj, getMat(color, 1)); }
        }
        else
        {
          // In-scope object that doesn't match any filter rule.
          // Always hide it — the filter defines what should be visible;
          // othersMode only controls truly non-scope elements.
          if (othersMode === "transparent") { objectMaterialMap.set(obj, othersMat); }
          else
          {
            this._hideFaces(obj);
            objectMaterialMap.set(obj, null);
          }
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

  _hideFaces(obj)
  {
    // Hide the visual leaf nodes (.faces/.edges inside Solids) rather than the Object3D
    // containers. IsolateSelectionTool's updateVisibility stops traversal at Solid, so it
    // never visits .faces/.edges — our hidden state persists through isolation cycles.
    obj.traverse(child =>
    {
      if (child.name?.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      {
        this._hide(child);
      }
    });
  }

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
      if (mat !== null && ObjectUtils.applyMaterial(obj, mat, false)) applied++;
      else if (mat === null) ObjectUtils.applyMaterial(obj, null, false);
      for (const child of obj.children) apply(child, mat);
    };
    apply(this.application.baseObject, null);
  }

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
    const labels = {
      has_param:    "tiene parámetro",
      no_param:     "sin parámetro",
      has_value:    "tiene valor",
      no_value:     "sin valor",
      exact:        `igual a "${value}"`,
      contains:     `contiene "${value}"`,
      starts:       `empieza por "${value}"`,
      ends:         `termina en "${value}"`,
      not_exact:    `distinto de "${value}"`,
      not_contains: `no contiene "${value}"`,
      not_starts:   `no empieza por "${value}"`,
      not_ends:     `no termina en "${value}"`,
    };
    return labels[mode] || `${mode} "${value}"`;
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

    const noValItem = this._legendItem("#888888", "— (sense valor)");
    noValItem.addEventListener("click", () =>
    {
      const objs = this._findObjects(obj =>
      {
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
    a.appendChild(document.createTextNode(label));
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
      : (activeRules[0] ? this._ruleLabel(activeRules[0]) : filtersText);
    const panel = this._createLegendPanel(titleText);
    const ul = document.createElement("ul");
    ul.className = "mv_legend_list";
    panel.bodyElem.appendChild(ul);

    // One block per rule (pack)
    activeRules.forEach((rule, rIdx) =>
    {
      // Clickable rule header
      const header = this._legendItem("#444444", `${rIdx + 1}. ${this._ruleLabel(rule)}`);
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
          return rule.entries.some(e =>
            this._matchesRule(obj, rule.pset, rule.param, e.mode, e.value));
        });
        this._performLegendSelect(objs);
      });
      ul.appendChild(header);

      // Sub-items: one row per rule entry (condition + color)
      rule.entries.forEach(entry =>
      {
        const condText = this._matchLabel(entry.mode, entry.value);
        const overrideText = entry.override === "hidden" ? " (ocult)" :
                             entry.override === "transparent" ? " (transp.)" : "";
        const sub = document.createElement("li");
        sub.className = "mv_legend_subitem";
        const a = document.createElement("a");
        a.href = "#";
        const swatch = document.createElement("span");
        swatch.className = "mv_legend_swatch";
        swatch.style.background = entry.color;
        a.appendChild(swatch);
        a.appendChild(document.createTextNode(condText + overrideText));
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
            return this._matchesRule(obj, rule.pset, rule.param, entry.mode, entry.value);
          });
          this._performLegendSelect(objs);
        });
        sub.appendChild(a);
        ul.appendChild(sub);
      });
    });

    // Item per a elements que no han coincidit amb cap regla
    const noMatchItem = this._legendItem("#888888", "✗ Sense coincidència");
    noMatchItem.addEventListener("click", () =>
    {
      const objs = this._findObjects(obj =>
      {
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
      rules:      this._rules.map(r => ({
        pset:    r.psetSelect.value,
        param:   r.paramSelect.value,
        entries: r.entries.map(e => ({
          match:    e.matchSelect.value,
          value:    e.valueInput.value.trim(),
          color:    e.colorInput.value,
          override: e.overrideSelect.value,
        }))
      })),
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
    rulesData.forEach(r => this._addRule(r));

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
    lines.push(`// ModelValidation: ${name}`);
    lines.push(`// Generated by BimRocket - Visual Model Validation`);
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
        if (!rule.entries?.length) continue;
        for (const entry of rule.entries)
        {
          const opacity = entry.override === "transparent" ? 0.2 : 1;
          const cond = this._entryToScriptCondition(rule.pset, rule.param, entry.match, entry.value);
          if (entry.override === "hidden")
          {
            lines.push(`// Hidden rule: ${cond}`);
          }
          else
          {
            lines.push(`bimrocket.updateAppearance($ => {`);
            lines.push(`  if (!_sv_inScope($)) return false;`);
            lines.push(`  return ${cond};`);
            lines.push(`}, {`);
            lines.push(`  meshMaterial: { color: "${entry.color}", transparent: ${opacity < 1}, opacity: ${opacity}, depthWrite: ${opacity >= 1} }`);
            lines.push(`});`);
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
      case "has_param":    return `${acc} != null`;
      case "no_param":     return `${acc} == null`;
      case "has_value":    return `${acc} != null && String(${acc}).trim() !== ""`;
      case "no_value":     return `(${acc} == null || String(${acc}).trim() === "")`;
      default:             return `${acc} === ${JSON.stringify(value)}`;
    }
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

  _contrastColor(hex)
  {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114) / 1000 > 128 ? "#000" : "#fff";
  }

  // ─── Utilitats ───────────────────────────────────────────────────────────

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
