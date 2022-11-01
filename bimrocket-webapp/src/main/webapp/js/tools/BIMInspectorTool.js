/*
 * BIMInspectorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Tree } from "../ui/Tree.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";

class BIMInspectorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_inspector";
    this.label = "bim|tool.bim_inspector.label";
    this.help = "bim|tool.bim_inspector.help";
    this.className = "bim_inspector";
    this.setOptions(options);

    this.createPanel();

    this.returnStack = [];
    this.ifcData = null;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onSelection = this.onSelection.bind(this);
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left",
      "bim_inspector_panel");

    this.helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.helpElem);

    this.backButton = Controls.addButton(this.panel.bodyElem,
      "bim_inspector_back", "button.back",
      () => this.goBack());

    this.typeElem = document.createElement("div");
    this.typeElem.className = "ifcClass";

    this.panel.bodyElem.appendChild(this.typeElem);

    this.tree = new Tree(this.panel.bodyElem);
  }

  activate()
  {
    const application = this.application;
    const container = application.container;

    application.addEventListener('selection', this._onSelection, false);
    container.addEventListener('pointerdown', this._onPointerDown, false);

    this.panel.visible = true;
    let object = this.application.selection.object;
    this.exploreObject(object);
  }

  deactivate()
  {
    const application = this.application;
    const container = application.container;

    application.removeEventListener('selection', this._onSelection, false);
    container.removeEventListener('pointerdown', this._onPointerDown, false);

    this.panel.visible = false;
  }

  onSelection(event)
  {
    const application = this.application;
    const object = application.selection.object;
    this.exploreObject(object);
  }

  onPointerDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;
    const pointerPosition = this.getEventPosition(event);
    const baseObject = application.baseObject;
    const intersect = this.intersect(pointerPosition, baseObject, true);
    if (intersect)
    {
      let object = intersect.object;
      var parent = object;
      while (parent && !parent.userData.selection)
      {
        parent = parent.parent;
      }
      if (parent && parent.userData.selection.group)
      {
        object = parent;
      }
      application.selection.set(object);
    }
    else
    {
      application.selection.clear();
    }
  }

  exploreObject(object)
  {
    this.ifcData = null;
    this.returnStack = [];

    const application = this.application;
    if (object && object._ifc)
    {
      I18N.set(this.helpElem, "innerHTML", "");
      application.i18n.update(this.helpElem);
      this.populateTree(object._ifc);
    }
    else
    {
      I18N.set(this.helpElem, "innerHTML", "bim|message.no_bim_object_selected");
      application.i18n.update(this.helpElem);
      this.typeElem.innerHTML = "";
      this.backButton.disabled = true;
      this.tree.clear();
    }
  }

  populateTree(ifcData)
  {
    let prevIfcData = this.ifcData;
    this.ifcData = ifcData;

    this.backButton.disabled = this.returnStack.length === 0;

    this.typeElem.innerHTML = ifcData.constructor.name;

    const tree = this.tree;
    tree.clear();

    let propertyNames = Object.getOwnPropertyNames(ifcData)
      .filter(property => !property.startsWith("_"));

    for (let propertyName of propertyNames)
    {
      let value = ifcData[propertyName];
      this.populateProperty(tree, propertyName, value, prevIfcData);
    }

    propertyNames = Object.getOwnPropertyNames(ifcData)
      .filter(property => property.startsWith("_") &&
      property !== "_loader" && property !== "_helper");

    for (let propertyName of propertyNames)
    {
      let value = ifcData[propertyName];
      this.populateProperty(tree, propertyName, value, prevIfcData);
    }
  }

  populateProperty(node, name, value, prevIfcData)
  {
    if (value instanceof Array)
    {
      let arrayNode = node.addNode(name +
        ": [ " + value.length + " ]", null, "array");
      for (let i = 0; i < value.length; i++)
      {
        let itemValue = value[i];
        this.populateProperty(arrayNode, "#" + i, itemValue, prevIfcData);
      }
    }
    else if (value instanceof Object)
    {
      let nextIfcData = value;
      let childNode = node.addNode(name + ": #" + value.constructor.name,
        event => this.followLink(nextIfcData), "object");

      if (value === prevIfcData)
      {
        childNode.expandAncestors();
        childNode.addClass("previous");
      }
    }
    else if (typeof value === "string")
    {
      node.addNode(name + ": " + value, null, "string");
    }
    else if (typeof value === "number")
    {
      node.addNode(name + ": " + value, null, "number");
    }
    else if (typeof value === "boolean")
    {
      node.addNode(name + ": " + value, null, "boolean");
    }
  }

  goBack()
  {
    if (this.returnStack.length > 0)
    {
      let ifcData = this.returnStack.pop();

      this.populateTree(ifcData);
    }
  }

  followLink(ifcData)
  {
    this.returnStack.push(this.ifcData);

    this.populateTree(ifcData);
  }
}

export { BIMInspectorTool };

