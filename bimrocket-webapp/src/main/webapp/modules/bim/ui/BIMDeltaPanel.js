/*
 * BIMDeltaPanel.js
 *
 * @author realor
 */

import { Panel } from "platform/ui/panel/Panel.js";
import { Tree } from "platform/ui/tree/Tree.js";
import { Controls } from "platform/ui/Controls.js";
import { TabbedPane } from "platform/ui/tabbedpane/TabbedPane.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { IFC, Constant } from "platform/io/ifc/IFC.js";
import { I18N } from "platform/i18n/I18N.js";
import { ModelSnapshot } from "platform/utils/ModelSnapshot.js";

class BIMDeltaPanel extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "bim_delta";
    this.title = "bim|tool.bim_delta.label";
    this.visible = false;
    this.setClassName("bim-delta-panel");
    this.minimumHeight = 200;
    this.defaultHeight = 300;
    this.defaultMobileHeight = 200;
    this.minimumHeight = 100;
    this.priority = 3;
    this.iconName = "bim|delta";

    const tabbedPane = new TabbedPane(this.bodyElem);
    tabbedPane.addClassName("h-full");

    const treeTab = tabbedPane.addTab("tree", "bim|tab.bim_delta_tree");
    const jsonTab = tabbedPane.addTab("json", "bim|tab.bim_delta_json");

    const deltaTree = new Tree(treeTab);
    this.deltaTree = deltaTree;
    deltaTree.translateLabels = true;
    deltaTree.getNodeLabel = (object) =>
    {
      if (typeof object === "string") return object;
      else
      {
        const elem = document.createElement("span");
        I18N.set(elem, "textContent", "bim|message.bim_delta_changes", object);
        return elem;
      }
    };

    this.jsonElem = document.createElement("pre");
    jsonTab.appendChild(this.jsonElem);

    this.onHide = () =>
    {
      this.deltaTree.clear();
      this.jsonElem.innerHTML = "";
    };
  }

  compareSnapshot(snapshot)
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const deltaTree = this.deltaTree;
    const jsonElem = this.jsonElem;

    deltaTree.clear();
    jsonElem.textContent = "";

    const globalId = snapshot.globalId;

    let root = this.findObjectByGlobalId(baseObject, globalId);
    if (root &&
        snapshot.version === ModelSnapshot.SNAPSHOT_VERSION &&
        snapshot.decimals === ModelSnapshot.decimals)
    {
      let changes = 0;
      const objectsChanged = [];
      const diff = [];
      let currentDiffObject = null;

      const currentSnapshot = ModelSnapshot.generate(root);
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
                let label = psetName + "." + key + ": " + value2 + " â " + value1;
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
      return true;
    }
    else
    {
      MessageDialog.create("bim|tool.bim_delta.label", "bim|message.bim_delta_cannot_compare")
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
    return false;
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
}

export { BIMDeltaPanel };