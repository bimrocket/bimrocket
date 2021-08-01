/*
 * BIMInventoryTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { TabbedPane } from "../ui/TabbedPane.js";
import { Tree } from "../ui/Tree.js";
import { Controls } from "../ui/Controls.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";

class BIMInventoryTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_inventory";
    this.label = "bim|tool.bim_inventory.label";
    this.help = "bim|tool.bim_inventory.help";
    this.className = "bim_inventory";
    this.setOptions(options);

    this.types = {};
    this.classifications = {};
    this.groups = {};
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.bodyElem.classList.add("padding");

    this.exploreButton = Controls.addButton(this.panel.bodyElem,
      "bim_inventory_explore", "bim|button.explore_selection",
      () => this.explore());

    // tabs

    this.tabbedPane = new TabbedPane(this.panel.bodyElem);
    this.tabbedPane.paneElem.classList.add("bim_inventory_tabs");

    this.typesPanelElem =
      this.tabbedPane.addTab("ifc_types", "bim|tab.types");
    this.typesTree = new Tree(this.typesPanelElem);

    this.classifPanelElem =
      this.tabbedPane.addTab("ifc_classif", "bim|tab.classifications");
    this.classifTree = new Tree(this.classifPanelElem);

    this.groupsPanelElem =
      this.tabbedPane.addTab("ifc_groups", "bim|tab.groups");
    this.groupsTree = new Tree(this.groupsPanelElem);
  }

  activate()
  {
    this.panel.visible = true;
    if (this.needsUpdate())
    {
      this.types = {};
      this.classifications = {};
      this.groups = {};
      this.typesTree.clear();
      this.classifTree.clear();
      this.groupsTree.clear();
    }
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  explore()
  {
    let baseObjects = this.application.selection.roots;
    if (baseObjects.length === 0)
    {
      baseObjects = [this.application.baseObject];
    }
    // types
    this.findTypes(baseObjects);
    this.showTypes();

    // classifications
    this.findClassifications(baseObjects);
    this.showClassifications();

    // groups
    this.findGroups(baseObjects);
    this.showGroups();
  }

  findTypes(baseObjects)
  {
    this.types = {};
    let types = this.types;

    for (let i = 0; i < baseObjects.length; i++)
    {
      baseObjects[i].traverse(object =>
      {
        if (object.userData.IFC && object.userData.IFC.ifcClassName &&
            object.type === "Object3D")
        {
          let ifcClassName = object.userData.IFC.ifcClassName;
          let type = types[ifcClassName];
          if (type === undefined)
          {
            type = {
              name : ifcClassName,
              objects : [],
              subTypes : {}
            };
            types[ifcClassName] = type;
          }
          type.objects.push(object);

          let typeName = object.userData.IFC_type ?
            object.userData.IFC_type.Name || "Unnamed" : "Others";

          let subType = type.subTypes[typeName];
          if (subType === undefined)
          {
            subType = {
              name : typeName,
              objects : []
            };
            type.subTypes[typeName] = subType;
          }
          subType.objects.push(object);
        }
      });
    }
  }

  findClassifications(baseObjects)
  {
    this.classifications = {};
    let classifs = this.classifications;

    // find classifications
    for (let i = 0; i < baseObjects.length; i++)
    {
      baseObjects[i].traverse(object =>
      {
        if (object.userData.IFC && object.type === "Object3D")
        {
          for (let key in object.userData)
          {
            if (key.indexOf("IFC_classification_") === 0)
            {
              let classifName = key.substring(19);
              if (classifs[classifName] === undefined)
              {
                classifs[classifName] = {
                  name : classifName,
                  references : {}
                };
              }
            }
          }
        }
      });
    }

    for (let i = 0; i < baseObjects.length; i++)
    {
      baseObjects[i].traverse(object =>
      {
        if (object.userData.IFC && object.type === "Object3D")
        {
          for (let classifName in classifs)
          {
            let key = "IFC_classification_" + classifName;
            let classifData = object.userData[key];
            let identification = classifData ? classifData.Identification : "?";
            let references = classifs[classifName].references;
            if (references[identification] === undefined)
            {
              references[identification] = {
                identification : identification,
                name : classifData ? classifData.Name : "Not classified",
                objects : []
              };
            }
            references[identification].objects.push(object);
          }
        }
      });
    }
  }

  findGroups(baseObjects)
  {
    this.groups = {};
    let groups = this.groups;

    for (let i = 0; i < baseObjects.length; i++)
    {
      baseObjects[i].traverse(object =>
      {
        if (object.userData.IFC && object.type === "Object3D")
        {
          for (let key in object.userData)
          {
            if (key.indexOf("IFC_group_") === 0)
            {
              let group = object.userData[key];
              let groupName = key.substring(10);
              if (groups[groupName] === undefined)
              {
                groups[groupName] = {
                  ifcClassName: group.ifcClassName,
                  name : groupName,
                  objects : []
                };
              }
              groups[groupName].objects.push(object);
            }
          }
        }
      });
    }
  }

  showTypes()
  {
    let typeNames = Object.keys(this.types);
    typeNames.sort();

    this.typesTree.clear();

    for (let i = 0; i < typeNames.length; i++)
    {
      let type = this.types[typeNames[i]];
      let objects = type.objects;
      let label = type.name + " (" + objects.length + ")";
      let className = typeNames[i];
      let node = this.typesTree.addNode(label, event =>
        this.application.selectObjects(event, objects), className);

      let subTypes = type.subTypes;
      let subTypeNames = Object.keys(subTypes);
      subTypeNames.sort();
      if (subTypeNames.length !== 1 || subTypeNames[0] !== "Others")
      {
        for (let j = 0; j < subTypeNames.length; j++)
        {
          let subTypeName = subTypeNames[j];
          let subType = subTypes[subTypeName];
          let subObjects = subType.objects;
          let subLabel = subTypeName + " (" + subObjects.length + ")";
          let subNode = node.addNode(subLabel, event =>
            this.application.selectObjects(event, subObjects),
            "IfcType");
        }
      }
    }
  }

  showClassifications()
  {
    let classifNames = Object.keys(this.classifications);
    classifNames.sort();

    this.classifTree.clear();

    for (let i = 0; i < classifNames.length; i++)
    {
      let classif = this.classifications[classifNames[i]];
      let label = classif.name;
      let node = this.classifTree.addNode(label, null, "IfcClassification");
      if (classifNames.length === 1) node.expand();

      let references = classif.references;
      let referenceIds = Object.keys(references);
      referenceIds.sort();
      for (let j = 0; j < referenceIds.length; j++)
      {
        let referenceId = referenceIds[j];
        let reference = references[referenceId];
        let objects = reference.objects;
        let subLabel = referenceId;
        if (reference.name) subLabel += ": " + reference.name;
        subLabel += " (" + objects.length + ")";
        let subNode = node.addNode(subLabel, event =>
          this.application.selectObjects(event, objects),
          "IfcClassificationReference");
      }
    }
  }

  showGroups()
  {
    let groupNames = Object.keys(this.groups);
    groupNames.sort();

    this.groupsTree.clear();

    for (let i = 0; i < groupNames.length; i++)
    {
      let group = this.groups[groupNames[i]];
      let objects = group.objects;
      let label = group.name + " (" + objects.length + ")";
      let node = this.groupsTree.addNode(label, event =>
        this.application.selectObjects(event, objects), "IfcGroup");
    }
  }

  needsUpdate()
  {
    /* update is needed if objects were removed */
    const types = this.types;
    const baseObject = this.application.baseObject;
    for (let key in types)
    {
      let type = types[key];
      let objects = type.objects;
      for (let i = 0; i < objects.length; i++)
      {
        let object = objects[i];
        if (!ObjectUtils.isObjectDescendantOf(object, baseObject))
          return true;
      }
    }
    return false;
  }
}

export { BIMInventoryTool };

