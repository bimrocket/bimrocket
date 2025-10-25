/*
 * HistogramTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class HistogramTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "histogram";
    this.label = "tool.histogram.label";
    this.className = "histogram";
    this.materialCount = 50;
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.TRANSPARENT_MATERIAL =
      new THREE.MeshLambertMaterial({ transparent : true, opacity: 0.3 });

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_histogram");
    this.panel.minimumHeight = 200;

    this.panel.onClose = () => this.application.useTool(null);

    this.psetSelect = Controls.addSelectField(this.panel.bodyElem,
      "pset", "label.property_set");

    this.psetSelect.addEventListener("change", () => this.updateProperties());

    this.propertySelect = Controls.addSelectField(this.panel.bodyElem,
      "property", "label.property");

    this.propertySelect.addEventListener("change", () => this.generateHistogram());

    this.groupSelect = Controls.addSelectField(this.panel.bodyElem,
      "round", "label.group_by",
      [["0", "option.no_groups"], "0.001", "0.01", "0.1", "1", "10", "100"]);

    this.groupSelect.addEventListener("change", () => this.generateHistogram());

    this.sortSelect = Controls.addSelectField(this.panel.bodyElem,
      "sortBy", "label.order_by",
      [["va", "option.value_asc"],
       ["vd", "option.value_desc"],
       ["oa", "option.occurrences_asc"],
       ["od", "option.occurrences_desc"]]);

    this.sortSelect.addEventListener("change", () => this.generateHistogram());

    this.highlightSelect = Controls.addSelectField(this.panel.bodyElem,
      "highlight", "label.highlight",
      [["N", "option.highlight_disabled"],
       ["R", "option.highlight_random_colors"],
       ["G", "option.highlight_color_grading"]]);

    this.highlightSelect.addEventListener("change", () => this.generateHistogram());

    this.showUndefinedCheckbox = Controls.addCheckBoxField(this.panel.bodyElem,
      "showUndefined", "label.show_undefined", false, "option_block");

    this.showUndefinedCheckbox.addEventListener("change", () => this.generateHistogram());


    const divElem = document.createElement("div");
    divElem.className = "buttons_bar";
    this.panel.bodyElem.appendChild(divElem);

    const updateButton = Controls.addButton(divElem,
      "update_histogram", "button.update", () =>
      { this.updatePsets(); this.generateHistogram(); });

    const resetButton = Controls.addButton(divElem,
      "reset", "button.reset", () => this.reset());

    this.listElem = document.createElement("ul");
    this.panel.bodyElem.appendChild(this.listElem);

    this.panel.onHide = () => this.reset();
  }

  execute()
  {
    const application = this.application;
    const container = application.container;
    this.panel.visible = true;

    this.updatePsets();
  }

  updatePsets()
  {
    let propertySets = new Set();

    this.application.baseObject.traverse(obj => {
      let keys = Object.keys(obj.userData);
      for (let key of keys)
      {
        propertySets.add(key);
      }
    });
    let options = Array.from(propertySets);
    options.sort();

    Controls.setSelectOptions(this.psetSelect, options);
    this.updateProperties();
  }

  updateProperties()
  {
    let psetName = this.psetSelect.value;
    let propertyNames = new Set();
    propertyNames.add("");
    this.application.baseObject.traverse(obj => {
      let pset = obj.userData[psetName];
      if (typeof pset === "object")
      {
        let keys = Object.keys(pset);
        for (let key of keys)
        {
          propertyNames.add(key);
        }
      }
    });
    let options = Array.from(propertyNames);
    options.sort();
    Controls.setSelectOptions(this.propertySelect, options);
    this.generateHistogram();
  }

  generateHistogram()
  {
    this.listElem.innerHTML = "";

    const propertyName = this.propertySelect.value;
    if (propertyName === "")
    {
      this.restoreMaterials();
      return;
    }

    const psetName = this.psetSelect.value;
    const showUndefined = this.showUndefinedCheckbox.checked;
    const groupFactor = parseFloat(this.groupSelect.value);
    const highlight = this.highlightSelect.value;

    let valueMap = new Map();

    this.application.baseObject.traverseVisible(obj => {
      let pset = obj.userData[psetName];
      if (typeof pset === "object")
      {
        let value = pset[propertyName];
        if (typeof value !== "object")
        {
          if (showUndefined || value !== undefined)
          {
            if (typeof value === "number" && groupFactor !== 0)
            {
              value = Math.round(value / groupFactor) * groupFactor;
              value = Math.round(value * 10000) / 10000;
            }

            let objectArray = valueMap.get(value);
            if (objectArray === undefined)
            {
              objectArray = [];
              valueMap.set(value, objectArray);
            }
            objectArray.push(obj);
          }
        }
      }
    });

    let valueArray = Array.from(valueMap);
    const sortMode = this.sortSelect.value;
    if (sortMode === "va")
    {
      // sort by value ascending
      valueArray.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    }
    else if (sortMode === "vd")
    {
      // sort by value descending
      valueArray.sort((a, b) => a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0);
    }
    else if (sortMode === "oa")
    {
      // sort by occurences ascending
      valueArray.sort((a, b) => a[1].length - b[1].length);
    }
    else if (sortMode === "od")
    {
      // sort by occurences descending
      valueArray.sort((a, b) => b[1].length - a[1].length);
    }

    let maxOccurs = 0;
    let totalOccurs = 0;

    for (let valueItem of valueArray)
    {
      let occurs = valueItem[1].length;
      if (occurs > maxOccurs) maxOccurs = occurs;
      totalOccurs += occurs;
    }
    const totalValues = valueArray.length;
    const materialArray = [];

    if (highlight === "R")
    {
      this.createRandomMaterials(totalValues, materialArray);
    }
    else if (highlight === "G")
    {
      this.createGradientMaterials(totalValues, materialArray);
    }

    const objectMaterialMap = new Map();

    const listElem = this.listElem;
    for (let i = 0; i < totalValues; i++)
    {
      let valueItem = valueArray[i];
      let value = valueItem[0];
      let objects = valueItem[1];
      let occurs = objects.length;

      let itemElem = document.createElement("li");
      listElem.appendChild(itemElem);

      if (highlight === "R" || highlight === "G")
      {
        let material = highlight === "R" ?
          materialArray[ i % materialArray.length ] :
          materialArray[ Math.floor(i * materialArray.length / totalValues) ];

        let bulletElem = document.createElement("div");
        bulletElem.className = "item_bullet";
        bulletElem.style.backgroundColor = material.color.getStyle();
        itemElem.appendChild(bulletElem);

        for (let object of objects)
        {
          objectMaterialMap.set(object, material);
        }
      }

      let contentElem = document.createElement("div");
      contentElem.className = "item_cnt";
      itemElem.appendChild(contentElem);

      let linkElem = document.createElement("a");
      contentElem.appendChild(linkElem);

      let perc = (100 * occurs / totalOccurs).toFixed(2);

      let valueElem = document.createElement("span");
      if (value === undefined)
      {
        I18N.set(valueElem, "textContent", "label.undefined");
        this.application.i18n.update(valueElem);
        valueElem.className = "undefined";
      }
      else if (typeof value === "string")
      {
        valueElem.textContent = value;
        valueElem.className = "string";
      }
      else if (typeof value === "number")
      {
        valueElem.textContent = String(value);
        valueElem.className = "number";
      }
      else if (typeof value === "boolean")
      {
        valueElem.textContent = String(value);
        valueElem.className = "boolean";
      }

      let statsElem = document.createElement("span");
      statsElem.textContent = " (" + occurs + ") " + perc + "%";
      linkElem.appendChild(valueElem);
      linkElem.appendChild(statsElem);
      linkElem.href = "#";
      linkElem.addEventListener("click", () => this.selectObjects(objects));

      let barElem = document.createElement("div");
      barElem.className = "bar";
      contentElem.appendChild(barElem);

      let barValueElem = document.createElement("div");
      barValueElem.style.width = Math.ceil(100 * occurs / maxOccurs) + "%";
      barElem.appendChild(barValueElem);
    }

    if (objectMaterialMap.size === 0)
    {
      this.restoreMaterials();
    }
    else
    {
      this.applyMaterials(objectMaterialMap);
    }
  }

  reset()
  {
    this.listElem.innerHTML = "";
    this.propertySelect.value = "";
    this.restoreMaterials();
  }

  selectObjects(objects)
  {
    this.application.selection.set(...objects);
  }

  createRandomMaterials(count, materialArray)
  {
    count = Math.min(count, this.materialCount);
    for (let i = 0; i < count; i++)
    {
      let red = Math.random();
      let green = Math.random();
      let blue = Math.random();
      let color = new THREE.Color(red, green, blue);
      let material = new THREE.MeshLambertMaterial({ color: color });
      materialArray.push(material);
    }
  }

  createGradientMaterials(count, materialArray)
  {
    count = Math.min(count, this.materialCount);
    for (let i = 0; i < count; i++)
    {
      let red = i / count;
      let green = 0;
      let blue = 1 - (i / count);
      let color = new THREE.Color(red, green, blue);
      let material = new THREE.MeshLambertMaterial({ color: color });
      materialArray.push(material);
    }
  }

  applyMaterials(objectMaterialMap)
  {
    const applyMaterial = (obj, parentMaterial) =>
    {
      if (obj.visible)
      {
        let material = objectMaterialMap.get(obj) || parentMaterial;
        ObjectUtils.applyMaterial(obj, material, false);

        if (obj.type === "Object3D" || obj.type === "Group")
        {
          for (let i = 0; i < obj.children.length; i++)
          {
            applyMaterial(obj.children[i], material);
          }
        }
      }
    };

    applyMaterial(this.application.baseObject, this.TRANSPARENT_MATERIAL);
    this.application.repaint();
  }

  restoreMaterials()
  {
    this.application.baseObject.traverse(obj => {
      ObjectUtils.applyMaterial(obj, null, false);
    });
    this.application.repaint();
  }

}

export { HistogramTool };
