/*
 * BIMDeltaTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Tree } from "../ui/Tree.js";
import { Panel } from "../ui/Panel.js";
import { TabbedPane } from "../ui/TabbedPane.js";
import { InputDialog } from "../ui/InputDialog.js";
import { FileExplorer } from "../ui/FileExplorer.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Metadata, Result } from "../io/FileService.js";
import { Solid } from "../core/Solid.js";
import { IFC } from "../io/ifc/IFC.js";
import { I18N } from "../i18n/I18N.js";

class BIMDeltaTool extends Tool
{
  static SNAPSHOT_VERSION = "1.0";

  constructor(application, options)
  {
    super(application);
    this.name = "bim_delta";
    this.label = "bim|tool.bim_delta.label";
    this.className = "bim_delta";
    this.decimals = 6;
    this.setOptions(options);
    application.addTool(this);

    const panel = new FileExplorer(application);
    this.panel = panel;
    panel.title = "bim|title.bim_delta_snapshots";
    panel.group = "ifc_snapshots";

    const deltaPanel = new Panel(application);
    this.deltaPanel = deltaPanel;
    deltaPanel.title = "bim|tool.bim_delta.label";
    deltaPanel.visible = false;
    deltaPanel.setClassName("bim_delta_panel");
    deltaPanel.minimumHeight = 200;

    const tabbedPane = new TabbedPane(deltaPanel.bodyElem);
    tabbedPane.addClassName("h_full");

    const treeTab = tabbedPane.addTab("tree", "bim|tab.bim_delta_tree");
    const jsonTab = tabbedPane.addTab("json", "bim|tab.bim_delta_json");

    deltaPanel.deltaTree = new Tree(treeTab);
    deltaPanel.deltaTree.translateLabels = true;
    deltaPanel.deltaTree.getNodeLabel = (object) =>
    {
      if (typeof object === "string") return object;
      else
      {
        const elem = document.createElement("span");
        I18N.set(elem, "textContent", "bim|message.bim_delta_changes", object);
        return elem;
      }
    };

    deltaPanel.jsonElem = document.createElement("pre");
    jsonTab.appendChild(deltaPanel.jsonElem);

    deltaPanel.onHide = () =>
    {
      deltaPanel.deltaTree.clear();
      deltaPanel.jsonElem.innerHTML = "";
      console.info("hide");
    };

    panel.addContextButton("save", "button.save",
      () => this.showSaveDialog(), () => panel.service !== null);

    panel.openFile = (url, data) => this.openFile(url, data);
    panel.onHide = () => this.application.useTool(null);

    application.panelManager.addPanel(this.panel);
    application.panelManager.addPanel(this.deltaPanel);
  }

  activate()
  {
    this.panel.visible = true;
    if (this.panel.service === null)
    {
      this.panel.goHome();
    }
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  openFile(url, data)
  {
    const application = this.application;
    const deltaPanel = this.deltaPanel;
    try
    {
      const snapshot = JSON.parse(data);
      this.compareSnapshot(snapshot);
      deltaPanel.visible = true;
      if (!deltaPanel.visible) deltaPanel.visible = true;
      else deltaPanel.minimized = false;
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", String(ex))
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  showSaveDialog()
  {
    const application = this.application;
    const panel = this.panel;

    const object = application.selection.object;
    if (object && object.userData.IFC?.GlobalId)
    {
      let name = object.userData.IFC.Name || "snp";
      let filename = name.replaceAll(" ", "_") + "-" +
        (new Date()).toISOString().substring(0, 19).replaceAll(":", "-");

      let dialog = new InputDialog(application,
        "bim|tool.bim_delta.label", "bim|label.bim_delta_snapshot_name", filename);
      dialog.setI18N(this.application.i18n);
      dialog.onAccept = () =>
      {
        let name = dialog.inputElem.value;
        panel.entryName = name;
        panel.entryType = Metadata.FILE;
        this.saveFile(panel.basePath + "/" + name, object);
        dialog.hide();
      };
      dialog.show();
    }
    else
    {
      MessageDialog.create("bim|tool.bim_delta.label", "bim|message.bim_delta_not_ifc_object")
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  saveFile(path, object)
  {
    const panel = this.panel;
    const snapshot = this.generateSnapshot(object);
    const data = JSON.stringify(snapshot, null, 2);
    panel.savePath(path, data);
  }

  compareSnapshot(snapshot)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const deltaTree = this.deltaPanel.deltaTree;
    const jsonElem = this.deltaPanel.jsonElem;

    deltaTree.clear();
    jsonElem.textContent = "";

    const globalId = snapshot.globalId;

    let root = this.findObjectByGlobalId(baseObject, globalId);
    if (root &&
        snapshot.version === this.constructor.SNAPSHOT_VERSION &&
        snapshot.decimals === this.decimals)
    {
      let changes = 0;
      const objectsChanged = [];
      const diff = [];
      let currentDiffObject = null;

      const currentSnapshot = this.generateSnapshot(root);
      const deltaNode = deltaTree.addNode(0,
        () => this.selectObjects(objectsChanged), "delta");

      for (let globalId of Object.keys(currentSnapshot.objects))
      {
        const onClick = () => this.selectObject(globalId);

        let objectData1 = currentSnapshot.objects[globalId];
        let objectData2 = snapshot.objects[globalId];
        if (objectData1 && objectData2)
        {
          let objectNode = null;

          for (let psetName of Object.keys(objectData1))
          {
            const pset1 = objectData1[psetName] || {};
            const pset2 = objectData2[psetName] || {};
            for (let key of Object.keys(pset1))
            {
              const value1 = pset1[key];
              const value2 = pset2[key];
              if (value1 !== value2)
              {
                if (!objectNode)
                {
                  objectNode = deltaNode.addNode(objectData1.IFC.Name || "Object",
                    onClick, objectData1.IFC?.ifcClassName);
                  let globalId = objectData1.IFC?.GlobalId;
                  if (globalId) objectsChanged.push(globalId);
                  currentDiffObject = {
                    IFC : objectData1.IFC,
                    type: "change",
                    changes : [] };
                  diff.push(currentDiffObject);
                }
                let label = psetName + "." + key + ": " + value2 + " → " + value1;
                objectNode.addNode(label, onClick, "changed");
                changes++;
                currentDiffObject.changes.push(label);
              }
            }
          }
        }
        else if (objectData1 && !objectData2)
        {
          const objectNode = deltaNode.addNode(objectData1.IFC.Name || "Object",
            onClick, objectData1.IFC?.ifcClassName);
          objectNode.addClass("added");
          objectNode.addNode("bim|label.bim_delta_added", onClick, "added");
          changes++;
          let globalId = objectData1.IFC?.GlobalId;
          if (globalId) objectsChanged.push(globalId);
          currentDiffObject = { IFC : objectData1.IFC, type : "added" };
          diff.push(currentDiffObject);
        }
      }

      for (let globalId of Object.keys(snapshot.objects))
      {
        let objectData1 = currentSnapshot.objects[globalId];
        let objectData2 = snapshot.objects[globalId];

        if (!objectData1 && objectData2)
        {
          const objectNode = deltaNode.addNode(
            objectData2.IFC.Name || "Object",
              () => application.selection.clear(), objectData2.IFC?.ifcClassName);
          objectNode.addClass("removed");
          objectNode.addNode("bim|label.bim_delta_removed", null, "removed");
          changes++;
          currentDiffObject = { IFC : objectData2.IFC, type : "removed" };
          diff.push(currentDiffObject);
        }
      }
      deltaNode.value = changes;
      deltaNode.expand(1);
      application.i18n.updateTree(deltaTree.rootsElem);
      jsonElem.textContent = JSON.stringify(diff, null, 2);
    }
    else
    {
      MessageDialog.create("bim|tool.bim_delta.label", "bim|message.bim_delta_cannot_compare")
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  generateSnapshot(object)
  {
    let globalId = object.userData.IFC.GlobalId;

    const snapshot = {
      version : this.constructor.SNAPSHOT_VERSION,
      globalId : globalId,
      dateTime : new Date().toISOString(),
      decimals : this.decimals,
      objects : {}
    };

    object.traverse(obj =>
    {
      if (obj.visible)
      {
        let globalId = obj.userData.IFC?.GlobalId;
        if (typeof globalId === "string")
        {
          snapshot.objects[globalId] = this.getObjectData(obj);
        }
      }
    });
    return snapshot;
  }

  getObjectData(object)
  {
    const objectData = {};

    const userData = object.userData;
    for (let psetName of Object.keys(userData))
    {
      const transform = {
        "position" : "(" + this.round(object.position.x) + ", " +
                           this.round(object.position.y) + ", " +
                           this.round(object.position.z) + ")",
        "rotation" : "(" + this.round(object.rotation.x) + ", " +
                           this.round(object.rotation.y) + ", " +
                           this.round(object.rotation.z) + ")",
        "scale" : "(" + this.round(object.scale.x) + ", " +
                        this.round(object.scale.y) + ", " +
                        this.round(object.scale.z) + ")"
      };
      objectData["transform"] = transform;

      const repr = IFC.getRepresentation(object);
      if (repr)
      {
        objectData["representation"] = this.getRepresentationData(repr);
      }

      if (psetName === "IFC") // Attributes
      {
        const attribs = userData[psetName];
        if (typeof attribs.ifcClassName === "string")
        {
          objectData["IFC"] = {};
          this.copyProperties(attribs, objectData["IFC"]);
        }
      }
      else if (psetName.startsWith("IFC_"))
      {
        const pset = userData[psetName];
        if (pset.ifcClassName === "IfcPropertySet")
        {
          objectData[psetName] = {};
          this.copyProperties(pset, objectData[psetName]);
        }
      }
    }
    return objectData;
  }

  copyProperties(source, target)
  {
    for (let propName of Object.keys(source))
    {
      let value = source[propName];
      let valueType = typeof value;
      if (valueType === "string" ||
          valueType === "number" ||
          valueType === "boolean")
      {
        target[propName] = value;
      }
    }
  }

  getRepresentationData(repr)
  {
    const items = repr instanceof Solid ? [repr] : repr.children;

    let area = 0;
    let vertices = 0;
    for (let item of items)
    {
      if (item instanceof Solid)
      {
        const geometry = item.geometry;
        vertices += geometry.vertices.length;
        for (let face of geometry.faces)
        {
          area += face.getArea();
        }
      }
    }
    return {
      items : items.length,
      vertices : vertices,
      area : this.round(area)
    };
  }

  selectObject(globalId)
  {
    const application = this.application;
    const baseObject = application.baseObject;

    let root = this.findObjectByGlobalId(baseObject, globalId);
    if (root)
    {
      application.selection.set(root);
    }
    else
    {
      application.selection.clear();
    }
  }

  selectObjects(globalIds)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const objects = [];

    for (let globalId of globalIds)
    {
      let root = this.findObjectByGlobalId(baseObject, globalId);
      if (root)
      {
        objects.push(root);
      }
    }
    application.selection.set(...objects);
  }

  findObjectByGlobalId(obj, globalId)
  {
    if (obj.userData.IFC?.GlobalId === globalId) return obj;

    for (let child of obj.children)
    {
      let root = this.findObjectByGlobalId(child, globalId);
      if (root) return root;
    }
    return null;
  }

  round(number)
  {
    const k = Math.pow(10, this.decimals);
    return String(Math.round(number * k) / k);
  }
}

export { BIMDeltaTool };