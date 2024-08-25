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
import { TabbedPane } from "./TabbedPane.js";

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

    this.definitionButton = Controls.addButton(this.entityPanelElem,
      "bim_inspector_definition", "bim|button.definition",
      () => {
        if (this.ifcEntity)
        {
          this.populateDefinitionTree(this.ifcEntity.constructor);
          this.tabbedPane.showTab("definition");
        }
      });

    this.referencesButton = Controls.addButton(this.entityPanelElem,
      "bim_inspector_references", "bim|button.references",
      () => this.findReferencesTo(this.ifcEntity));

    this.typeElem = document.createElement("div");
    this.typeElem.className = "ifcClass";
    this.entityPanelElem.appendChild(this.typeElem);

    this.entityTree = new Tree(this.entityPanelElem);

    this.definitionPanelElem =
      this.tabbedPane.addTab("definition", "bim|tab.definition");
    this.definitionTree = new Tree(this.definitionPanelElem);

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
      this.ifcEntity = ifcRoot;
      this.tabbedPane.showTab("entity");
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
      this.definitionButton.disabled = true;
      this.referencesButton.disabled = true;
      this.entityTree.clear();
      this.definitionTree.clear();
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
    this.definitionButton.disabled = false;
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
    let isInverse;
    if (name.startsWith("_"))
    {
      isInverse = true;
      name = name.substring(1);
    }
    else
    {
      isInverse = false;
    }
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
      let className = "array";
      if (isInverse) className += " inverse";
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

  populateDefinitionTree(ifcClass)
  {
    const tree = this.definitionTree;
    tree.clear();

    if (!ifcClass) return;

    const schema = ifcClass.schema;
    let hierarchy = [];

    while (ifcClass && ifcClass.name !== "Entity")
    {
      hierarchy.push(ifcClass);
      ifcClass = ifcClass.__proto__; // parent class
    }
    hierarchy.reverse();

    let attributeCount = 1;
    for (let superIfcClass of hierarchy)
    {
      let node = tree.addNode(superIfcClass.name,
        event => this.populateDefinitionTree(superIfcClass), "object");
      let attributeNames = Object.keys(superIfcClass);
      for (let attributeName of attributeNames)
      {
        let attributeType = superIfcClass[attributeName];
        attributeCount = this.populateClassAttribute(node, schema,
          attributeName, attributeType, attributeCount);
      }
      node.expand();
    }
  }

  populateClassAttribute(node, schema,
    attributeName, attributeType, attributeCount)
  {
    const isCollection = attributeType instanceof Array;
    const isInverse = attributeName.startsWith("_");
    let className = isInverse ? "inverse" : "";
    let attributeField = "";
    if (isInverse)
    {
      attributeField = attributeName.substring(1) + ": ";
    }
    else if (attributeCount > 0)
    {
      attributeField = attributeCount + ". " + attributeName + ": ";
      attributeCount++;
    }

    if (isCollection)
    {
      const colType = attributeType[0];
      const ifcClassName = attributeType[1];
      const minOccurs = attributeType[2];
      const maxOccurs = attributeType[3] === 0 ? "?" : attributeType[3];

      className += " array";
      let colNode = node.addNode(attributeField +
        colType + " [ " + minOccurs + " : " + maxOccurs + " ]", null, className);
      if (schema[ifcClassName])
      {
        this.populateClassAttribute(colNode, schema, "", ifcClassName, 0);
      }
      else
      {
        className += this.getBasicTypeClassName(ifcClassName);
        colNode.addNode(ifcClassName, null, className);
      }
    }
    else
    {
      const attributeIfcClass = schema[attributeType];
      if (!attributeIfcClass) // basic type
      {
        className += this.getBasicTypeClassName(attributeType);
        node.addNode(attributeField + attributeType, null, className);
      }
      else if (attributeIfcClass.isEntity)
      {
        className += "object";
        const ifcClassName = attributeIfcClass.name;
        node.addNode(attributeField + ifcClassName,
          event => this.populateDefinitionTree(attributeIfcClass), className);
      }
      else if (attributeIfcClass.isSelect)
      {
        className += "select";
        const ifcClassName = attributeIfcClass.name;
        const selectNode = node.addNode(attributeField + ifcClassName,
          null, className);
        const options = attributeIfcClass.Options;
        for (let option of options)
        {
          this.populateClassAttribute(selectNode, schema, "", option, 0);
        }
      }
      else if (attributeIfcClass.isEnumeration)
      {
        className += "enumeration";
        const ifcClassName = attributeIfcClass.name;
        const enumNode = node.addNode(attributeField + ifcClassName,
          null, className);
        let values = attributeIfcClass.Values;
        for (let value of values)
        {
          enumNode.addNode(value, null, "constant");
        }
      }
      else // DefinedType
      {
        const ifcClassName = attributeIfcClass.name;
        let defType = attributeIfcClass.Value;
        if (defType instanceof Array)
        {
          className += "array";
          const defNode = node.addNode(attributeField + ifcClassName,
            null, className);
          this.populateClassAttribute(defNode, schema, "", defType, 0);
        }
        else
        {
          let ifcClass = schema[defType];
          while (ifcClass && ifcClass.isDefinedType)
          {
            defType = ifcClass.Value;
            ifcClass = typeof defType === "string" ? schema[defType] : null;
          }
          className += this.getBasicTypeClassName(defType);
          node.addNode(attributeField + ifcClassName +
            " (" + defType + ")", null, className);
        }
      }
    }
    return attributeCount;
  }

  getBasicTypeClassName(basicType)
  {
    let className;
    switch (basicType)
    {
      case "INTEGER":
      case "REAL":
      case "NUMBER":
        className = "number";
        break;

      case "BOOLEAN":
      case "LOGICAL":
        className = "boolean";
        break;

      default:
        className = "string";
    }
    return className;
  }

  goBack()
  {
    if (this.returnStack.length > 0)
    {
      let ifcEntity = this.returnStack.pop();

      this.populateEntityTree(ifcEntity);
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
    this.ifcEntity = ifcEntity;
    this.tabbedPane.showTab("entity");
  }

  getEntityIdSuffix(ifcEntity)
  {
    return ifcEntity._id !== null ? ":" + ifcEntity._id : "";
  }
}

export { BIMInspectorPanel };
