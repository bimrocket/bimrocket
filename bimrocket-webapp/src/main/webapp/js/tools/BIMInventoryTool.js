/*
 * BIMInventoryTool.js
 *
 * @author realor
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
    this.layers = {};
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

    this.layersPanelElem =
      this.tabbedPane.addTab("ifc_layers", "bim|tab.layers");
    this.layersTree = new Tree(this.layersPanelElem);
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
      this.layersTree.clear();
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

    // layers
    this.findLayers(baseObjects);
    this.showLayers();
  }

  findTypes(baseObjects)
  {
    this.types = {};
    let types = this.types;

    for (let baseObject of baseObjects)
    {
      baseObject.traverse(object =>
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

          let typeId = object.userData.IFC_type ?
            object.userData.IFC_type.GlobalId : "?";
          let typeName = object.userData.IFC_type ?
            object.userData.IFC_type.Name || "Unnamed" : "Others";

          let subType = type.subTypes[typeId];
          if (subType === undefined)
          {
            subType = {
              typeId : typeId,
              name : typeName,
              objects : []
            };
            type.subTypes[typeId] = subType;
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
    for (let baseObject of baseObjects)
    {
      baseObject.traverse(object =>
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

    for (let baseObject of baseObjects)
    {
      baseObject.traverse(object =>
      {
        if (object.userData.IFC && object.type === "Object3D")
        {
          for (let classifName in classifs)
          {
            let key = "IFC_classification_" + classifName;
            let classifData = object.userData[key];
            let identification = classifData ?
              classifData.Identification || classifData.ItemReference : "?";
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

    for (let baseObject of baseObjects)
    {
      baseObject.traverse(object =>
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

  findLayers(baseObjects)
  {
    this.layers = {};
    let layers = this.layers;

    for (let baseObject of baseObjects)
    {
      baseObject.traverse(object =>
      {
        if (object.userData.IFC_layer)
        {
          let layerName = object.userData.IFC_layer.Name;
          let layer = layers[layerName];
          if (typeof layer === "undefined")
          {
            layer = { name : layerName, objects : [] };
            layers[layerName] = layer;
          }
          layer.objects.push(object);
        }
      });
    }
  }

  showTypes()
  {
    let typeNames = Object.keys(this.types);
    typeNames.sort();

    this.typesTree.clear();

    for (let typeName of typeNames)
    {
      let type = this.types[typeName];
      let subTypes = [];
      for (let typeId in type.subTypes)
      {
        subTypes.push(type.subTypes[typeId]);
      }
      subTypes.sort((typeA, typeB) =>
      {
        if (typeA.name < typeB.name) return -1;
        if (typeA.name > typeB.name) return 1;
        return 0;
      });

      let objects = type.objects;
      let label = type.name + " (" + subTypes.length +
        "/" + objects.length + ")";
      let className = typeName;

      let node = this.typesTree.addNode(label, event =>
        this.application.userSelectObjects(objects, event), className);

      if (subTypes.length > 1 || subTypes[0].name !== "Others")
      {
        for (let subType of subTypes)
        {
          let subObjects = subType.objects;
          let subLabel = subType.name + " (" + subObjects.length + ")";
          node.addNode(subLabel, event =>
            this.application.userSelectObjects(subObjects, event),
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

    for (let classifName of classifNames)
    {
      let classif = this.classifications[classifName];
      let label = classif.name;
      let node = this.classifTree.addNode(label, null, "IfcClassification");
      if (classifNames.length === 1) node.expand();

      let references = classif.references;
      let referenceIds = Object.keys(references);
      referenceIds.sort();
      for (let referenceId of referenceIds)
      {
        let reference = references[referenceId];
        let objects = reference.objects;
        let subLabel = referenceId;
        if (reference.name) subLabel += ": " + reference.name;
        subLabel += " (" + objects.length + ")";
        node.addNode(subLabel, event =>
          this.application.userSelectObjects(objects, event),
          "IfcClassificationReference");
      }
    }
  }

  showGroups()
  {
    let groupNames = Object.keys(this.groups);
    groupNames.sort();

    this.groupsTree.clear();

    for (let groupName of groupNames)
    {
      let group = this.groups[groupName];
      let objects = group.objects;
      let label = group.name + " (" + objects.length + ")";
      this.groupsTree.addNode(label, event =>
        this.application.userSelectObjects(objects, event), "IfcGroup");
    }
  }

  showLayers()
  {
    let layerNames = Object.keys(this.layers);
    layerNames.sort();

    this.layersTree.clear();

    for (let layerName of layerNames)
    {
      let layer = this.layers[layerName];
      let objects = layer.objects;
      let label = layer.name + " (" + objects.length + ")";
      this.layersTree.addNode(label, event =>
        this.application.userSelectObjects(objects, event), "IfcLayer");
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

