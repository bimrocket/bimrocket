/**
 * BSDDPanel.js
 *
 * @author realor
 */

import { Application } from "./Application.js";
import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { TabbedPane } from "./TabbedPane.js";
import { I18N } from "../i18n/I18N.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class BSDDPanel extends Panel
{
  static BSDD_HOST = "https://api.bsdd.buildingsmart.org";

  constructor(application)
  {
    super(application);
    this.id = "bsdd_panel";
    this.title = "bSDD";
    this.position = "left";
    this.setClassName("bsdd_panel");
    this.minimumHeight = 200;

    this.dictionaryUri = null;
    this.classUri = null;
    this.baseUrl = "/bimrocket-server/api/proxy?url=" + BSDDPanel.BSDD_HOST;
    this.headers = {
      "Accept" : "application/json",
      "X-User-Agent" : "bimrocket/" + Application.VERSION
    };

    this.infoElem = document.createElement("div");
    this.bodyElem.appendChild(this.infoElem);

    this.tabbedPane = new TabbedPane(this.bodyElem);
    this.tabbedPane.addClassName("h_full");

    this.dictPanelElem =
      this.tabbedPane.addTab("dictionaries", "bim|tab.bsdd_dictionaries");
    this.dictPanelElem.classList.add("p_4");

    this.classPanelElem =
      this.tabbedPane.addTab("classes", "bim|tab.bsdd_classes");
    this.classPanelElem.classList.add("p_4");

    this.propPanelElem =
      this.tabbedPane.addTab("properties", "bim|tab.bsdd_properties");

    // dictionaries
    this.dictButton = Controls.addButton(this.dictPanelElem, "bsdd_dict_connect", "button.connect",
      () => this.showDictionaries());
    this.dictFilterElem = Controls.addInputField(this.dictPanelElem,
      "text", "bsdd_dict", "bim|label.bsdd_filter", null, "field_flex");
    this.dictFilterElem.parentElement.classList.add("hidden");

    this.dictHeaderElem = document.createElement("div");
    this.dictHeaderElem.className = "header";
    this.dictPanelElem.appendChild(this.dictHeaderElem);

    this.dictContentElem = document.createElement("div");
    this.dictContentElem.className = "text_left";
    this.dictPanelElem.appendChild(this.dictContentElem);

    // classes
    this.classTypeSelect = Controls.addSelectField(this.classPanelElem,
      "bsdd_classtype", "bim|label.bsdd_class_type",
      ["Class", "GroupOfProperties", "AlternativeUse", "Material"],
      null, "field_flex");
    this.classTypeSelect.addEventListener("change", () => this.showClasses());
    this.classTypeSelect.parentElement.classList.add("hidden");

    this.classFilterElem = Controls.addInputField(this.classPanelElem,
      "text", "bsdd_class", "bim|label.bsdd_filter", null, "field_flex");
    this.classFilterElem.parentElement.classList.add("hidden");

    this.classHeaderElem = document.createElement("div");
    this.classHeaderElem.className = "header";
    this.classPanelElem.appendChild(this.classHeaderElem);

    this.classContentElem = document.createElement("div");
    this.classContentElem.className = "text_left";
    this.classPanelElem.appendChild(this.classContentElem);

    // properties
    this.propertyContentElem = document.createElement("div");
    this.propertyContentElem.className = "form";
    this.propPanelElem.appendChild(this.propertyContentElem);

    this.dictFilterElem.addEventListener("input", () =>
     this.onDictionaryFilterChange());
    this.dictFilterElem.setAttribute("spellcheck", false);

    this.classFilterElem.addEventListener("input", () =>
     this.onClassFilterChange());
    this.classFilterElem.setAttribute("spellcheck", false);

    this.selectedDictName = "";
    this.selectedClassCode = "";

    this._onSelection = this.onSelection.bind(this);
  }

  onShow()
  {
    this.application.addEventListener("selection", this._onSelection);
    this.loadProperties();
  }

  onHide()
  {
    this.application.removeEventListener("selection", this._onSelection);
  }

  onSelection(event)
  {
    this.loadProperties();
  }

  async showDictionaries()
  {
    try
    {
      const headerElem = this.dictHeaderElem;
      headerElem.innerHTML = '<div class="loading" />';

      const contentElem = this.dictContentElem;
      contentElem.innerHTML = "";

      let url = this.baseUrl +
        "/api/Dictionary/v1&IncludeTestDictionaries=false";

      const response = await fetch(url, { headers : this.headers });

      const json = await response.json();

      const listElem = document.createElement("ul");
      listElem.className = "items dictionaries";
      contentElem.appendChild(listElem);

      if (json.dictionaries instanceof Array)
      {
        json.dictionaries.sort((a, b) => a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));

        for (let dict of json.dictionaries)
        {
          this.addDictionary(listElem, dict);
        }
      }
      this.filterDictionaries();
    }
    catch (ex)
    {
      this.infoElem.textContent = ex;
    }
  }

  addDictionary(listElem, dict)
  {
    const title = dict.name + " " + dict.version;
    const detail = `<ul>
      <li>Code: ${dict.code}</li>
      <li>Organization: ${dict.organizationCodeOwner}</li>
      <li>Language: ${dict.defaultLanguageCode}</li>
      <li>Status: ${dict.status}</li>
      <li>Last update: ${dict.lastUpdatedUtc}</li>
      </ul>
    `;

    this.addItem(listElem, title, detail, () => {
      this.dictionaryUri = dict.uri;
      this.selectedDictName = title;
      this.showClasses();
    });
  }

  async showClasses()
  {
    try
    {
      const headerElem = this.classHeaderElem;
      headerElem.innerHTML = '<div class="loading" />';

      const contentElem = this.classContentElem;
      contentElem.innerHTML = "";

      this.classTypeSelect.parentElement.classList.remove("hidden");
      const classType = this.classTypeSelect.value;

      this.tabbedPane.showTab("classes");

      let offset = 0;
      let json = null;
      const classes = [];
      do
      {
        let url = this.baseUrl +
          "/api/Dictionary/v1/Classes&Uri=" + this.dictionaryUri +
          "&ClassType=" + classType + "&Offset=" + offset + "&Limit=1000";
        let response = await fetch(url, { headers : this.headers });

        json = await response.json();
        classes.push(...json.classes);

        offset += json.classesCount;
      } while (offset < json.classesTotalCount);

      classes.sort((a, b) => a.code < b.code ? -1 : (a.code > b.code ? 1 : 0));

      const listElem = document.createElement("ul");
      listElem.className = "items classes";
      contentElem.appendChild(listElem);

      for (let cls of classes)
      {
        this.addClass(listElem, cls);
      }
      this.filterClasses();
    }
    catch (ex)
    {
      this.infoElem.textContent = ex;
    }
  }

  addClass(listElem, cls)
  {
    const title = cls.name;
    const detail = `<ul>
      <li>Code: ${cls.code}</li>
      <li>Description: ${cls.descriptionPart}</li>
      </ul>
    `;

    this.addItem(listElem, title, detail, () => {
      this.classUri = cls.uri;
      this.selectedClassCode = cls.code;
      this.showProperties();
    });
  }

  addItem(parentElem, title, detail, action)
  {
    const itemElem = document.createElement("li");
    itemElem.className = "hidden";
    parentElem.appendChild(itemElem);

    const mainElem = document.createElement("div");
    itemElem.appendChild(mainElem);
    mainElem.className = "main";

    const detailElem = document.createElement("div");
    itemElem.appendChild(detailElem);
    detailElem.className = "detail";

    const selectLink = document.createElement("a");
    selectLink.href = "#";
    selectLink.textContent = title;
    selectLink.addEventListener("click", (event) => {
      event.preventDefault();
      const selectedItemElem = parentElem.querySelector(".selected");
      if (selectedItemElem) selectedItemElem.classList.remove("selected");
      itemElem.classList.add("selected");
      action();
    });
    mainElem.appendChild(selectLink);

    const toggleButton = document.createElement("a");
    toggleButton.role = "button";
    toggleButton.href = "#";
    toggleButton.addEventListener("click", (event) =>
    {
      event.preventDefault();
      itemElem.classList.toggle("expanded");
    });
    mainElem.appendChild(toggleButton);

    detailElem.innerHTML = detail;
  }

  onDictionaryFilterChange()
  {
    if (this.dictTimeoutId)
    {
      clearTimeout(this.dictTimeoutId);
    }
    this.dictTimeoutId = setTimeout(() => this.filterDictionaries(), 500);
  }

  onClassFilterChange()
  {
    if (this.classTimeoutId)
    {
      clearTimeout(this.classTimeoutId);
    }
    this.classTimeoutId = setTimeout(() => this.filterClasses(), 500);
  }

  filterDictionaries()
  {
    const value = this.dictFilterElem.value.trim();
    this.filter(this.dictHeaderElem, this.dictFilterElem, this.dictContentElem,
      value, value.length === 0 ?
      "bim|message.bsdd_dictionary_count" : "bim|message.bsdd_dictionary_found");
  }

  filterClasses()
  {
    const value = this.classFilterElem.value.trim();
    this.filter(this.classHeaderElem, this.classFilterElem, this.classContentElem,
      value, value.length === 0 ?
      "bim|message.bsdd_class_count" : "bim|message.bsdd_class_found");
  }

  filter(headerElem, filterElem, contentElem, value, message)
  {
    value = value.toLowerCase();
    const items = contentElem.querySelectorAll(":scope > ul > li");
    let count = 0;
    for (let item of items)
    {
      let itemText = item.textContent.toLowerCase();
      let visible = itemText.includes(value);
      if (visible)
      {
        item.classList.remove("hidden");
        count++;
      }
      else
      {
        item.classList.add("hidden");
      }
    }
    const summaryElem = document.createElement("div");
    summaryElem.className = "summary";
    I18N.set(summaryElem, "textContent", message, count, items.length);
    this.application.i18n.update(summaryElem);

    if (items.length === 0)
    {
      filterElem.parentElement.classList.add("hidden");
    }
    else
    {
      filterElem.parentElement.classList.remove("hidden");
    }

    headerElem.innerHTML = "";
    headerElem.appendChild(summaryElem);
  }

  async showProperties()
  {
    try
    {
      const contentElem = this.propertyContentElem;
      contentElem.innerHTML = '<div class="loading" />';

      this.tabbedPane.showTab("properties");

      const url = this.baseUrl +
        "/api/Class/Properties/v1&ClassUri=" + this.classUri;
      const response = await fetch(url, { headers : this.headers });
      const json = await response.json();

      if (json.classProperties instanceof Array)
      {
        json.classProperties.sort((a, b) => {
          const na = a.propertySet + "." + a.name;
          const nb = b.propertySey + "." + b.name;
          return na.name < nb.name ? -1 : (na.name > nb.name ? 1 : 0);
        });

        contentElem.innerHTML = "";

        const headerElem = document.createElement("div");
        headerElem.className = "header";
        let formTitle = this.selectedDictName;
        if (this.selectedClassCode.length > 0)
        {
          formTitle += " > " + this.selectedClassCode;
        }
        headerElem.textContent = formTitle;
        contentElem.appendChild(headerElem);

        const bodyElem = document.createElement("div");
        bodyElem.className = "properties";
        contentElem.appendChild(bodyElem);

        const footerElem = document.createElement("div");
        footerElem.className = "footer";
        contentElem.appendChild(footerElem);

        const saveButton = Controls.addButton(footerElem,
          "bsdd_save", "button.save", () => {
            this.saveProperties();
            this.endEdition();
          });

        const cancelButton = Controls.addButton(footerElem,
          "bsdd_cancel", "button.cancel", () => {
            this.endEdition();
            this.loadProperties();
          });

        this.application.i18n.updateTree(footerElem);

        let id = 0;
        let psetName = null;
        let psetBodyElem = null;

        for (let prop of json.classProperties)
        {
          if (psetName !== prop.propertySet)
          {
            const psetElem = document.createElement("div");
            psetElem.className = "pset";

            const psetHeaderElem = document.createElement("div");
            psetHeaderElem.innerHTML = `<div>${prop.propertySet}</div><a href="#" role="button">`;
            psetHeaderElem.className = "header";
            psetElem.appendChild(psetHeaderElem);

            const psetButton = psetHeaderElem.querySelector("a");
            psetButton.addEventListener("click", event => {
              event.preventDefault();
              psetElem.classList.toggle("expanded");
            });

            psetBodyElem = document.createElement("div");
            psetBodyElem.className = "body";
            psetElem.appendChild(psetBodyElem);

            bodyElem.appendChild(psetElem);

            if (psetName === null) psetElem.classList.add("expanded");
            psetName = prop.propertySet;
          }
          this.addProperty(psetBodyElem, prop, id++);
        }
        this.loadProperties();
      }
    }
    catch (ex)
    {
      this.infoElem.textContent = ex;
    }
  }

  addProperty(psetElem, prop, id)
  {
    const fieldId = "bsdd_prop_" + id;
    const dataType = prop.dataType;

    const propElem = document.createElement("div");
    psetElem.appendChild(propElem);
    propElem.className = "property";
    propElem.id = fieldId;
    propElem._property = prop;
    propElem._loaded = false; // property not fully loaded

    const blankNull = text => !text ? "" : text;

    propElem.innerHTML = `
      <label>
        <div class="name">${prop.name} <code>(${prop.propertyCode})</code></div>
        <div class="value"></div>
      </label>
      <div class="help">
        <div class="attr">
          <div>${prop.dataType}, ${prop.propertyValueKind}</div>
          <a href="#" role="button" class="desc_button"></a>
        </div>
        <div class="desc">${blankNull(prop.description)}</div>
      </div>
    `;
    const helpElem = propElem.querySelector(".help");
    const valueElem = propElem.querySelector(".value");
    const attrElem = propElem.querySelector(".attr");
    const descButton = helpElem.querySelector(".desc_button");

    descButton.addEventListener("click", event => {
      helpElem.classList.toggle("expanded");
      event.preventDefault();
    });

    const control = this.createPropertyEditor(propElem);
    valueElem.appendChild(control);
  }

  async editProperty(propElem)
  {
    let prop = propElem._property;

    const valueElem = propElem.querySelector(".value");
    let control = valueElem.querySelector(".control");

    if (prop.dataType === "String" || prop.dataType === undefined)
    {
      // look for allowed values
      if (prop.allowedValues === undefined)
      {
        let url = this.baseUrl + "/api/Property/v4&Uri=" + prop.propertyUri;
        let response = await fetch(url, { headers : this.headers });

        const detailedProp = await response.json();

        if (detailedProp.allowedValues)
        {
          // change control

          const value = control.value;
          prop.allowedValues = detailedProp.allowedValues;

          control = this.createPropertyEditor(propElem);
          control.value = value;

          valueElem.innerHTML = "";
          valueElem.appendChild(control);
        }
        else
        {
          prop.allowedValues = [];
        }
      }
    }
    control.focus();
  }

  createPropertyEditor(propElem)
  {
    const prop = propElem._property;

    const dataType = prop.dataType;
    let control;

    if (dataType === "Real")
    {
      control = document.createElement("input");
      control.type = "number";
      control.style.maxWidth = "150px";
    }
    else if (dataType === "Integer")
    {
      control = document.createElement("input");
      control.type = "number";
      control.style.maxWidth = "150px";
    }
    else if (dataType === "Boolean")
    {
      control = document.createElement("select");
      control.style.maxWidth = "80px";
      control.innerHTML = `<option></option>
        <option>true</option>
        <option>false</option>`;
    }
    else if (dataType === "Character")
    {
      control = document.createElement("input");
      control.type = "text";
      control.maxLength = 1;
      control.style.maxWidth = "20px";
    }
    else if (dataType === "Time")
    {
      control = document.createElement("input");
      control.type = "date";
      control.style.maxWidth = "150px";
    }
    else if (prop.allowedValues)
    {
      control = document.createElement("select");
      const values = [""];
      for (let allowedValue of prop.allowedValues)
      {
        values.push([allowedValue.code, allowedValue.value]);
      }
      Controls.setSelectOptions(control, values);
    }
    else
    {
      control = document.createElement("input");
      control.type = "text";
    }
    control.id = propElem.id + "_control";
    control.className = "control";
    control.setAttribute("spellcheck", "false");

    control.addEventListener("focus", () => this.editProperty(propElem));

    control.addEventListener("input", () => {
      propElem.classList.add("changed");
    });

    control.addEventListener("keyup", event => {
      if (event.keyCode === 13)
      {
        if (propElem.nextElementSibling)
        {
          let nextControl = propElem.nextElementSibling.querySelector(".control");
          nextControl.focus();
        }
        else
        {
          this.propertyContentElem.querySelector(".footer button").focus();
        }
      }
    });
    return control;
  }

  endEdition()
  {
    const elems = [...this.propertyContentElem.querySelectorAll(".property")];
    for (let propElem of elems)
    {
      propElem.classList.remove("changed");
    }
  }

  saveProperties()
  {
    const objects = this.application.selection.objects;
    if (objects.length === 0) return;

    const elems = this.propertyContentElem.querySelectorAll(".changed");
    for (let propElem of elems)
    {
      const prop = propElem._property;
      const control = propElem.querySelector(".control");
      let value = control.value;

      for (let object of objects)
      {
        let userData = object.userData;
        let psetName = prop.propertySet === "Attributes" ?
          "IFC" : "IFC_" + prop.propertySet;
        let pset = userData[psetName];
        if (!pset)
        {
          pset = {};
          pset.ifcClassName = prop.propertySet === "Attributes" ?
            this.selectedClassCode : "IfcPropertySet";
          userData[psetName] = pset;
        }
        if (value === "")
        {
          delete pset[prop.propertyCode];
        }
        else
        {
          if (prop.dataType === "Boolean")
          {
            value = value === "true";
          }
          else if (prop.dataType === "Integer" || prop.dataType === "Real")
          {
            value = Number(value);
          }
          pset[prop.propertyCode] = value; // cast type
        }
      }
    }
    this.application.notifyObjectsChanged(objects);
  }

  loadProperties()
  {
    const objects = this.application.selection.objects;
    if (objects.length === 0) return;

    const controls = this.propertyContentElem.querySelectorAll(".control");
    for (let control of controls)
    {
      control.value = ""; // reset values
      control._setValue = false;
    }

    const elems = this.propertyContentElem.querySelectorAll(".property");
    for (let propElem of elems)
    {
      let prop = propElem._property;
      for (let object of objects)
      {
        let userData = object.userData;
        let psetName = prop.propertySet === "Attributes" ?
          "IFC" : "IFC_" + prop.propertySet;
        let pset = userData[psetName];
        if (pset)
        {
          let control = propElem.querySelector(".control");
          let oldValue = control.value;
          let newValue = pset[prop.propertyCode];
          if (newValue === undefined) newValue = "";

          if (!control._setValue)
          {
            control.value = newValue;
            control._setValue = true;
          }
          else if (String(newValue) !== String(oldValue))
          {
            control.value = "*";
          }
        }
      }
    }
  }
}

export { BSDDPanel };