/*
 * BIMInspectorPanel.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Controls } from "./Controls.js";
import { Tree } from "./Tree.js";
import { IFC, Constant } from "../io/ifc/IFC.js";
import { I18N } from "../i18n/I18N.js";

class BIMInspectorPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.title = "bim|tool.bim_inspector.label";
    this.position = "left";
    this.setClassName("bim_inspector_panel");

    this.pageSize = 10;

    this.returnStack = [];
    this.ifcFile = null;
    this.ifcEntity = null;

    this.helpElem = document.createElement("div");
    this.bodyElem.appendChild(this.helpElem);
    this.helpElem.classList.add("mb_4");

    this.tabbedPane = new TabbedPane(this.bodyElem);
    this.tabbedPane.paneElem.classList.add("bim_inspector_tabs");

    this.filePanelElem =
      this.tabbedPane.addTab("file", "bim|tab.file");

    this.schemaElem = document.createElement("div");
    this.schemaElem.className = "ifcSchema";
    this.filePanelElem.appendChild(this.schemaElem);
    this.fileTree = new Tree(this.filePanelElem);

    this.entityPanelElem =
      this.tabbedPane.addTab("entity", "bim|tab.entity");

    this.backButton = Controls.addButton(this.entityPanelElem,
      "bim_inspector_back", "button.back",
      () => this.goBack());

    this.viewButton = Controls.addButton(this.entityPanelElem,
      "bim_inspector_show", "button.view",
      () => this.viewEntity(this.ifcEntity));

    this.referencesButton = Controls.addButton(this.entityPanelElem,
      "bim_inspector_references", "bim|button.references",
      () => this.findReferencesTo(this.ifcEntity));

    this.typeElem = document.createElement("div");
    this.typeElem.className = "ifcClass";
    this.entityPanelElem.appendChild(this.typeElem);

    this.entityTree = new Tree(this.entityPanelElem);

    this.inheritancePanelElem =
      this.tabbedPane.addTab("inheritance", "bim|tab.inheritance");
    this.inheritanceTree = new Tree(this.inheritancePanelElem);

    this.referencesPanelElem =
      this.tabbedPane.addTab("references", "bim|tab.references");
    this.referencesTree = new Tree(this.referencesPanelElem);

    this._onSelection = this.onSelection.bind(this);
  }

  onShow()
  {
    const application = this.application;
    const container = application.container;
    application.addEventListener('selection', this._onSelection, false);

    let object = this.application.selection.object;
    this.exploreObject(object);
  }

  onHide()
  {
    const application = this.application;
    const container = application.container;
    application.removeEventListener('selection', this._onSelection, false);
  }

  onSelection(event)
  {
    const application = this.application;
    const object = application.selection.object;
    this.exploreObject(object);
  }

  exploreObject(object)
  {
    const application = this.application;

    let prevIfcFile = this.ifcFile;

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
      this.populateEntityTree(ifcRoot);
      this.populateInheritance(ifcRoot);
      this.ifcEntity = ifcRoot;
      const tabName = this.tabbedPane.getVisibleTabName();
      if (tabName !== "entity" && tabName !== "inheritance")
      {
        this.tabbedPane.showTab("entity");
      }
      this.helpElem.style.display = "none";
    }
    else
    {
      I18N.set(this.helpElem, "textContent", "bim|message.no_bim_object_selected");
      application.i18n.update(this.helpElem);
      this.helpElem.style.display = "";
      this.schemaElem.textContent = "";
      this.typeElem.textContent = "";
      this.backButton.disabled = true;
      this.viewButton.disabled = true;
      this.referencesButton.disabled = true;
      this.entityTree.clear();
      this.inheritanceTree.clear();
      this.referencesTree.clear();
    }

    if (this.ifcFile !== prevIfcFile)
    {
      this.populateFile();
    }
  }

  populateFile()
  {
    const ifcFile = this.ifcFile;
    const tree = this.fileTree;
    tree.clear();

    if (ifcFile)
    {
      const schema = ifcFile.schema;
      this.schemaElem.textContent = "Schema: " + ifcFile.getSchemaName();

      let classNames = [...ifcFile.entitiesByClass.keys()].sort();
      for (let className of classNames)
      {
        if (schema[className].isEntity)
        {
          let array = ifcFile.entitiesByClass.get(className);
          let classNode = tree.addNode(className + " [ " + array.length + " ]", null, "array");
          this.populateArray(classNode, array, 0);
        }
      }
    }
  }

  populateArray(node, array, start, recursive = false)
  {
    const pageSize = this.pageSize;
    node.clear();
    if (start >= pageSize)
    {
      node.addNode("Previous",
        event => this.populateArray(node, array, start - pageSize, recursive),
        "previous");
    }
    let end = Math.min(array.length, start + pageSize);
    for (let i = start; i < end; i++)
    {
      let itemValue = array[i];
      this.populateProperty(node, "[ " + i + " ]", itemValue, null, recursive);
    }
    if (end < array.length)
    {
      node.addNode("Next",
        event => this.populateArray(node, array, start + pageSize, recursive),
        "next");
    }
  }

  populateEntityTree(ifcEntity)
  {
    if (ifcEntity === this.ifcEntity) return;

    let prevIfcData = this.ifcEntity;

    this.backButton.disabled = this.returnStack.length === 0;
    this.viewButton.disabled = ifcEntity.GlobalId === undefined;
    this.referencesButton.disabled = false;

    let id = this.getEntityIdSuffix(ifcEntity);
    this.typeElem.textContent = ifcEntity.constructor.name + id;

    const tree = this.entityTree;
    tree.clear();

    this.populateEntityNode(tree, ifcEntity, prevIfcData, true);
  }

  populateEntityNode(node, ifcEntity, prevIfcData, recursive)
  {
    let propertyNames = Object.getOwnPropertyNames(ifcEntity)
      .filter(property => !property.startsWith("_"));

    for (let propertyName of propertyNames)
    {
      let value = ifcEntity[propertyName];
      this.populateProperty(node, propertyName, value, prevIfcData, recursive);
    }

    propertyNames = Object.getOwnPropertyNames(ifcEntity)
      .filter(property => property.startsWith("_") && property !== "_id");

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
      const array = value;
      let className = name.startsWith("_") ? "inverse" : "array";
      let arrayNode = node.addNode(name +
        ": [ " + value.length + " ]", null, className);
      this.populateArray(arrayNode, array, 0, recursive);
    }
    else if (value instanceof Object)
    {
      let nextIfcData = value;
      let id = this.getEntityIdSuffix(value);
      let childNode = node.addNode(name + ": " + value.constructor.name + id,
        event => this.followLink(nextIfcData), "object");

      if (!value.GlobalId && recursive) // no ifcroot, no inverse
      {
        this.populateEntityNode(childNode, value, prevIfcData, recursive);
      }

      if (value === prevIfcData)
      {
        childNode.expandAncestors();
        childNode.addClass("previous");
      }
    }
  }

  populateInheritance(ifcEntity)
  {
    if (ifcEntity === this.ifcEntity) return;

    const schema = ifcEntity.constructor.schema;
    let ifcClass = Object.getPrototypeOf(ifcEntity);
    let hierarchy = [];

    while (ifcClass.constructor.name !== "Entity")
    {
      hierarchy.push(ifcClass.constructor.name);
      ifcClass = Object.getPrototypeOf(ifcClass);
    }
    hierarchy.reverse();

    const tree = this.inheritanceTree;
    tree.clear();
    let propCount = 0;
    let attributeCount = 1;
    for (let className of hierarchy)
    {
      let node = tree.addNode(className, null, "object");
      let instance = new schema[className];
      let props = Object.getOwnPropertyNames(instance);
      for (let i = propCount; i < props.length; i++)
      {
        let attributeName = props[i];
        if (attributeName === "_id") continue;

        if (attributeName.startsWith("_")) // inverse
        {
          node.addNode(attributeName, null, "inverse");
        }
        else
        {
          node.addNode(attributeCount + ": " + attributeName);
          attributeCount++;
        }
      }
      node.expand();
      propCount = props.length;
    }
  }

  goBack()
  {
    if (this.returnStack.length > 0)
    {
      let ifcEntity = this.returnStack.pop();

      this.populateEntityTree(ifcEntity);
      this.populateInheritance(ifcEntity);
      this.ifcEntity = ifcEntity;
    }
  }

  viewEntity(ifcEntity)
  {
    const application = this.application;
    const globalId = ifcEntity.GlobalId;
    const objects = application.findObjects($ => $("IFC", "GlobalId") === globalId);

    const container = application.container;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = application.camera;

    application.scene.updateMatrixWorld(true);
    ObjectUtils.zoomAll(camera, objects, aspect, true);

    application.notifyObjectsChanged(camera, this);
    application.selection.set(...objects);

    console.info(objects);
  }

  findReferencesTo(ifcEntity)
  {
    const tree = this.referencesTree;
    tree.clear();

    const id = this.getEntityIdSuffix(ifcEntity);
    const node = tree.addNode(ifcEntity.constructor.name + id, null, "object");

    const references = this.ifcFile.findReferencesTo(ifcEntity);

    this.populateArray(node, references, 0);
    node.expand();
    this.tabbedPane.showTab("references");
  }

  followLink(ifcEntity)
  {
    this.returnStack.push(this.ifcEntity);

    this.populateEntityTree(ifcEntity);
    this.populateInheritance(ifcEntity);
    this.ifcEntity = ifcEntity;
    this.tabbedPane.showTab("entity");
  }

  getEntityIdSuffix(ifcEntity)
  {
    return ifcEntity._id !== null ? ":" + ifcEntity._id : "";
  }
}

export { BIMInspectorPanel };
