/*
 * BIMInspectorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Tree } from "../ui/Tree.js";
import { Constant } from "../io/ifc/IFC.js";
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
    this.ifcFile = null;
    this.ifcEntity = null;

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
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    const pointerPosition = application.getPointerPosition(event);
    const baseObject = application.baseObject;
    const intersect = this.intersect(pointerPosition, baseObject, true);
    if (intersect)
    {
      let object = this.findActualSelectedObject(intersect.object);

      application.selection.set(object);
    }
    else
    {
      application.selection.clear();
    }
  }

  exploreObject(object)
  {
    const application = this.application;

    this.ifcFile = null;
    this.ifcEntity = null;
    this.returnStack = [];

    let ifcRoot = null;

    if (object)
    {
      let rootObject = null;
      let current = object;

      while (current.parent && current !== application.baseObject)
      {
        if (rootObject === null && current.userData.IFC?.GlobalId) // is IfcRoot?
        {
          rootObject = current;
        }

        if (current._ifcFile)
        {
          this.ifcFile = current._ifcFile;
          break;
        }

        current = current.parent;
      }

      if (this.ifcFile && rootObject)
      {
        const globalId = rootObject.userData.IFC.GlobalId;
        ifcRoot = this.ifcFile.entitiesByGlobalId.get(globalId);
      }
    }

    if (ifcRoot)
    {
      I18N.set(this.helpElem, "textContent", "");
      application.i18n.update(this.helpElem);
      this.populateTree(ifcRoot);
    }
    else
    {
      I18N.set(this.helpElem, "textContent", "bim|message.no_bim_object_selected");
      application.i18n.update(this.helpElem);
      this.typeElem.textContent = "";
      this.backButton.disabled = true;
      this.tree.clear();
    }
  }

  populateTree(ifcEntity)
  {
    let prevIfcData = this.ifcEntity;
    this.ifcEntity = ifcEntity;

    this.backButton.disabled = this.returnStack.length === 0;

    this.typeElem.textContent = ifcEntity.constructor.name;

    const tree = this.tree;
    tree.clear();

    this.populateNode(tree, ifcEntity, prevIfcData, true);
  }

  populateNode(node, ifcEntity, prevIfcData, recursive)
  {
    let propertyNames = Object.getOwnPropertyNames(ifcEntity)
      .filter(property => !property.startsWith("_"));

    for (let propertyName of propertyNames)
    {
      let value = ifcEntity[propertyName];
      this.populateProperty(node, propertyName, value, prevIfcData, recursive);
    }

    propertyNames = Object.getOwnPropertyNames(ifcEntity)
      .filter(property => property.startsWith("_"));

    for (let propertyName of propertyNames)
    {
      let value = ifcEntity[propertyName];
      this.populateProperty(node, propertyName, value, prevIfcData, false);
    }
  }

  populateProperty(node, name, value, prevIfcData, recursive)
  {
    if (typeof value === "string")
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
    else if (value === undefined)
    {
      node.addNode(name + ": undefined", null, "object");
    }
    else if (value instanceof Constant)
    {
      node.addNode(name + ": " + value.value, null, "constant");
    }
    else if (value instanceof Array)
    {
      let arrayNode = node.addNode(name +
        ": [ " + value.length + " ]", null, "array");
      for (let i = 0; i < value.length; i++)
      {
        let itemValue = value[i];
        this.populateProperty(arrayNode, "[ " + i+ " ]", itemValue, prevIfcData, recursive);
      }
    }
    else if (value instanceof Object)
    {
      let nextIfcData = value;
      let childNode = node.addNode(name + ": #" + value.constructor.name,
        event => this.followLink(nextIfcData), "object");

      if (!value.GlobalId && recursive) // no ifcroot, no inverse
      {
        this.populateNode(childNode, value, prevIfcData, recursive);
      }

      if (value === prevIfcData)
      {
        childNode.expandAncestors();
        childNode.addClass("previous");
      }
    }
  }

  goBack()
  {
    if (this.returnStack.length > 0)
    {
      let ifcEntity = this.returnStack.pop();

      this.populateTree(ifcEntity);
    }
  }

  followLink(ifcEntity)
  {
    this.returnStack.push(this.ifcEntity);

    this.populateTree(ifcEntity);
  }
}

export { BIMInspectorTool };

