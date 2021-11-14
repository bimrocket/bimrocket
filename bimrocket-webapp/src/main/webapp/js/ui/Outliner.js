/**
 * Outliner.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import { Tree } from "./Tree.js";
import * as THREE from "../lib/three.module.js";

class Outliner extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "outliner";
    this.position = "right";
    this.title = "tool.outliner.label";

    this.tree = new Tree(this.bodyElem);
    this.tree.rootsElem.className = "tree outliner";

    this.map = new Map();
    this.autoScroll = true;

    this.tree.getNodeLabel = object =>
    {
      let objectLabel = object.name;
      if (objectLabel === null || objectLabel.trim().length === 0)
      {
        objectLabel = object.id;
      }
      return objectLabel;
    };

    application.addEventListener("selection", () =>
    {
      this.updateSelection();
    });

    application.addEventListener("scene", event =>
    {
      if (event.type === "added")
      {
        let object = event.object;
        let parentTreeNode = this.map.get(event.parent);
        if (parentTreeNode)
        {
          let treeNode = this.populateObject(object, parentTreeNode);
          this.createMap(treeNode);
        }
      }
      else if (event.type === "removed")
      {
        let object = event.object;
        let treeNode = this.map.get(object);
        if (treeNode)
        {
          this.destroyMap(treeNode);
          treeNode.remove();
        }
      }
      else if (event.type === "nodeChanged")
      {
        for (let object of event.objects)
        {
          let treeNode = this.map.get(object);
          if (treeNode)
          {
            treeNode.updateLabel();
            this.updateNodeStyle(treeNode);
          }
        }
      }
      else if (event.type === "structureChanged")
      {
        let objects = this.getRootObjects(event.objects);
        if (objects.length === 1 && objects[0] === this.application.scene)
        {
          // update all tree
          this.update();
        }
        else
        {
          for (let object of objects)
          {
            let treeNode = this.map.get(object);
            if (treeNode)
            {
              this.destroyMap(treeNode);
              treeNode.updateLabel();
              treeNode.clear();
              this.populateChildren(treeNode);
              this.createMap(treeNode);
            }
          }
        }
        this.updateSelection();
      }
      else  if (event.type === "cameraActivated")
      {
        this.clearNodeStyle("active_camera");
        let camera = event.object;
        let treeNode = this.map.get(camera);
        if (treeNode) treeNode.addClass("active_camera");
      }
      else if (event.type === "cut")
      {
        this.clearNodeStyle("cut");
        for (let object of event.objects)
        {
          let treeNode = this.map.get(object);
          if (treeNode) treeNode.addClass("cut");
        }
      }
      else if (event.type === "pasted")
      {
        this.clearNodeStyle("cut");
        for (let object of event.objects)
        {
          let treeNode = this.map.get(object);
          if (treeNode) treeNode.expandAncestors(false);
        }
      }
    });

    if (application.scene) this.update();
  }

  update()
  {
    this.tree.clear();
    this.map.clear();
    let treeNode = this.populateObject(this.application.scene);
    this.createMap(treeNode);
  }

  updateSelection()
  {
    // clear previous selectes nodes
    this.clearNodeStyle("selected");

    // mark new selection
    const selection = this.application.selection;
    const objects = selection.objects;
    const lastObject = objects[objects.length - 1];
    for (let object of objects)
    {
      let treeNode = this.map.get(object);
      if (treeNode)
      {
        treeNode.addClass("selected");
        let makeVisible = object === lastObject && this.autoScroll;
        treeNode.expandAncestors(makeVisible);
      }
    }
    this.bodyElem.scrollLeft = 0;
    this.autoScroll = true;
  }

  populateObject(object, parentTreeNode)
  {
    const objectClass = this.getNodeClass(object);

    let onClick = event =>
    {
      this.autoScroll = false;
      this.application.selectObjects(event, [object]);
    };

    let treeNode;
    if (parentTreeNode)
    {
      treeNode = parentTreeNode.addNode(object, onClick, objectClass);
    }
    else
    {
      treeNode = this.tree.addNode(object, onClick, objectClass);
    }
    this.updateNodeStyle(treeNode);
    this.populateChildren(treeNode);

    return treeNode;
  }

  populateChildren(treeNode)
  {
    let object = treeNode.value;
    for (let child of object.children)
    {
      let name = child.name || "";
      if (!name.startsWith(THREE.Object3D.HIDDEN_PREFIX))
      {
        this.populateObject(child, treeNode);
      }
    }
  }

  getNodeClass(object)
  {
    if (object.type === "Object3D" &&
      object.userData.IFC && object.userData.IFC.ifcClassName)
    {
      return object.userData.IFC.ifcClassName;
    }
    else
    {
      return object.type;
    }
  }

  updateNodeStyle(treeNode)
  {
    const object = treeNode.value;
    const classList = treeNode.linkElem.classList;
    if (object.visible)
    {
      classList.remove("hidden");
    }
    else
    {
      classList.add("hidden");
    }
  }

  clearNodeStyle(className)
  {
    let nodes = this.tree.rootsElem.getElementsByClassName(className);
    nodes = [...nodes];
    for (let node of nodes)
    {
      node.classList.remove(className);
    }
  }

  getRootObjects(objects)
  {
    const set = new Set();
    for (let object of objects)
    {
      set.add(object);
    }

    const roots = [];
    for (let object of set)
    {
      let ancestor = object.parent;
      while (ancestor && !set.has(ancestor))
      {
        ancestor = ancestor.parent;
      }
      if (ancestor === null) roots.push(object);
    }
    return roots;
  }

  createMap(treeNode)
  {
    this.map.set(treeNode.value, treeNode);
    for (let childTreeNode of treeNode.children)
    {
      this.createMap(childTreeNode);
    }
  }

  destroyMap(treeNode)
  {
    this.map.delete(treeNode.value);
    for (let childTreeNode of treeNode.children)
    {
      this.destroyMap(childTreeNode);
    }
  }
}

export { Outliner };