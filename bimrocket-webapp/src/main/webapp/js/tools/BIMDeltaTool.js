/*
 * BIMDeltaTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Tree } from "../ui/Tree.js";
import { Panel } from "../ui/Panel.js";
import { InputDialog } from "../ui/InputDialog.js";
import { FileExplorer } from "../ui/FileExplorer.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Metadata, Result } from "../io/FileService.js";
import { I18N } from "../i18n/I18N.js";

class BIMDeltaTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_delta";
    this.label = "bim|tool.bim_delta.label";
    this.className = "bim_delta";
    this.setOptions(options);

    const panel = new FileExplorer(application);
    this.panel = panel;

    const deltaPanel = new Panel(application);
    this.deltaPanel = deltaPanel;
    deltaPanel.title = "bim|tool.bim_delta.label";
    deltaPanel.visible = false;
    deltaPanel.setClassName("bim_delta_panel");

    this.deltaTree = new Tree(deltaPanel.bodyElem);
    this.deltaTree.translateLabels = true;

    panel.title = this.label;
    panel.group = "ifc_snapshots";

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
    const snapshot = JSON.parse(data);
    this.compareSnapshot(snapshot);
    deltaPanel.visible = true;
  }

  showSaveDialog()
  {
    const application = this.application;
    const panel = this.panel;

    let filename = "snp-" +
      (new Date()).toISOString().substring(0, 19).replaceAll(":", "-");

    let dialog = new InputDialog(application, "bim|tool.bim_delta.label", "title.save_to_cloud", filename);
    dialog.setI18N(this.application.i18n);
    dialog.onAccept = () =>
    {
      let name = dialog.inputElem.value;
      panel.entryName = name;
      panel.entryType = Metadata.FILE;
      this.saveFile(panel.basePath + "/" + name);
      dialog.hide();
    };
    dialog.show();
  }

  saveFile(path)
  {
    const application = this.application;
    const panel = this.panel;

    const object = application.selection.object;
    if (object)
    {
      const snapshot = this.generateSnapshot(object);
      if (snapshot)
      {
        const data = JSON.stringify(snapshot, null, 2);
        panel.savePath(path, data);
      }
    }
  }

  compareSnapshot(snapshot)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const deltaTree = this.deltaTree;
    deltaTree.clear();

    const globalId = snapshot.globalId;

    let root = this.findObjectByGlobalId(baseObject, globalId);
    if (root)
    {
      const currentSnapshot = this.generateSnapshot(root);
      const deltaNode = deltaTree.addNode("bim|label.bim_delta_changes", null, "delta");
      deltaNode.expand(1);

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
                }
                objectNode.addNode(psetName + "." + key + ": " +
                  value2 + " -> " + value1, onClick, "changed");
              }
            }
          }
        }
        else if (objectData1 && !objectData2)
        {
          const objectNode = deltaNode.addNode(objectData1.IFC.Name || "Object",
            onClick, objectData1.IFC?.ifcClassName);
          objectNode.addNode("bim|label.bim_delta_added", onClick, "added");
        }
      }

      for (let globalId of Object.keys(snapshot.objects))
      {
        let objectData1 = currentSnapshot.objects[globalId];
        let objectData2 = snapshot.objects[globalId];

        if (!objectData1 && objectData2)
        {
          const objectNode = deltaNode.addNode(
            objectData2.IFC.Name || "Object", null, objectData2.IFC?.ifcClassName);
          objectNode.addNode("bim|label.bim_delta_removed", null, "removed");
        }
      }
      application.i18n.updateTree(deltaTree.rootsElem);
    }
  }

  generateSnapshot(object)
  {
    let snapshot = null;

    let globalId = object.userData.IFC?.GlobalId;
    if (globalId)
    {
      snapshot = {
        globalId : globalId,
        dateTime : new Date().toISOString(),
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
    }
    return snapshot;
  }

  getObjectData(object)
  {
    const objectData = {};

    const userData = object.userData;
    for (let psetName of Object.keys(userData))
    {
      if (psetName === "IFC") // Attributes
      {
        const attribs = userData[psetName];
        objectData["IFC"] = attribs;
      }
      else if (psetName.startsWith("IFC_"))
      {
        const pset = userData[psetName];
        if (pset.ifcClassName === "IfcPropertySet")
        {
          const props = userData[psetName];
          objectData[psetName] = props;
        }
      }
    }
    return objectData;
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

  selectObject(globalId)
  {
    const application = this.application;
    const baseObject = application.baseObject;

    let root = this.findObjectByGlobalId(baseObject, globalId);
    if (root)
    {
      application.selection.set(root);
    }
  }
}

export { BIMDeltaTool };