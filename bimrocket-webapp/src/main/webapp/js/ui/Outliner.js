/**
 * Outliner.js
 *
 * @author realor
 */

import { Panel } from "./Panel.js";
import * as THREE from "../lib/three.module.js";

class Outliner extends Panel
{
  constructor(application)
  {
    super(application);
    this.id = "outliner";
    this.position = "right";

    this.selectedLabels = [];
    this.lastSelectedLabel = null;
    this.activeCameraLabel = null;
    this.cutLabels = [];

    application.addEventListener("selection", event =>
    {
      this.updateSelection();
    });

    application.addEventListener("scene", event =>
    {
      if (event.type === "cut")
      {
        for (let i = 0; i < this.cutLabels.length; i++)
        {
          let labelElem = this.cutLabels[i];
          labelElem._cut = false;
          this.updateLabelStyle(labelElem);
        }
        this.cutLabels = [];
        let objects = event.objects;
        for (let i = 0; i < objects.length; i++)
        {
          let object = objects[i];
          let labelId = "ol-lab-" + object.id;
          let labelElem = document.getElementById(labelId);
          labelElem._cut = true;
          this.updateLabelStyle(labelElem);
          this.cutLabels.push(labelElem);
        }
      }
      else if (event.type === "added")
      {
        let parentListId = "ol-ul-" + event.parent.id;
        let parentListElem = document.getElementById(parentListId);
        if (parentListElem)
        {
          this.populateList(event.object, parentListElem);
        }
        else
        {
          let parentItemId = "ol-li-" + event.parent.id;
          let parentItemElem = document.getElementById(parentItemId);
          parentItemElem.innerHTML = "";
          this.populateItem(event.parent, parentItemElem);
        }
      }
      else if (event.type === "removed")
      {
        let itemId = "ol-li-" + event.object.id;
        let itemElem = document.getElementById(itemId);
        if (itemElem)
        {
          itemElem.parentNode.removeChild(itemElem);
          if (this.childCount(event.parent) === 0)
          {
            let buttonElemId = "ol-but-" + event.parent.id;
            let buttonElem = document.getElementById(buttonElemId);
            if (buttonElem)
            {
              buttonElem.parentNode.removeChild(buttonElem);
            }
            let parentListId = "ol-ul-" + event.parent.id;
            let parentListElem = document.getElementById(parentListId);
            if (parentListElem)
            {
              parentListElem.parentNode.removeChild(parentListElem);
            }
          }
        }
      }
      else if (event.type === "pasted")
      {
        for (let i = 0; i < this.cutLabels.length; i++)
        {
          let labelElem = this.cutLabels[i];
          labelElem._cut = false;
          this.updateLabelStyle(labelElem);
        }
        if (event.objects.length > 0)
        {
          this.expandObject(event.objects[0]);
        }
      }
      else if (event.type === "nodeChanged")
      {
        for (let object of event.objects)
        {
          let labelId = "ol-lab-" + object.id;
          let labelElem = document.getElementById(labelId);
          if (labelElem !== null)
          {
            this.updateLabel(labelElem, object);
          }
        }
      }
      else  if (event.type === "cameraActivated")
      {
        var labelId = "ol-lab-" + event.object.id;
        var labelElem = document.getElementById(labelId);
        if (labelElem !== this.activeCameraLabel)
        {
          if (this.activeCameraLabel !== null)
          {
            this.activeCameraLabel._activeCamera = false;
            this.updateLabelStyle(this.activeCameraLabel);
          }
          labelElem._activeCamera = true;
          this.updateLabelStyle(labelElem);
          this.activeCameraLabel = labelElem;
        }
      }
      else if (event.type === "structureChanged")
      {
        this.update();
      }
    });
    this.title = "tool.outliner.label";

    if (application.scene) this.update();
  }

  update()
  {
    this.bodyElem.innerHTML = "";
    let listElem = document.createElement("ul");
    listElem.className = "tree outliner";
    this.bodyElem.appendChild(listElem);
    this.populateList(this.application.scene, listElem);
  }

  getObjectClass(object)
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

  populateList(object, parentListElem)
  {
    let name = object.name;
    if (name === null || name === undefined || name === '')
      name = "object-" + object.id;
    if (name.indexOf(THREE.Object3D.HIDDEN_PREFIX) !== 0) // not hidden object
    {
      // li
      let itemElem = document.createElement("li");
      itemElem.id = "ol-li-" + object.id;
      itemElem.className = this.getObjectClass(object);
      parentListElem.appendChild(itemElem);
      this.populateItem(object, itemElem);
    }
  }

  populateItem(object, itemElem)
  {
    const buttonListener = function(event)
    {
      let buttonElem = event.srcElement || event.target;
      buttonElem.className = (buttonElem.className === "expand") ?
        "collapse" : "expand";
      let id = buttonElem.id.substring(7);
      let elem = document.getElementById("ol-ul-" + id);
      if (elem)
      {
        elem.className = (elem.className === "expanded") ?
          "collapsed" : "expanded";
      }
    };

    const labelListener = event =>
    {
      var labelElem = event.srcElement || event.target;
      var objectIdString = labelElem.id.substring(7);
      var objectId = parseInt(objectIdString, 10);
      if (isNaN(objectId)) objectId = objectIdString;
      this.lastSelectedLabel = labelElem;
      this.selectObjectById(objectId, event);
    };

    let hasChildren = this.childCount(object) > 0;
    // expand/collapse button
    if (hasChildren)
    {
      var buttonId = "ol-but-" + object.id;
      var buttonElem = document.createElement("button");
      buttonElem.id = buttonId;
      buttonElem.className = "expand";
      buttonElem.addEventListener("click", buttonListener);
      itemElem.appendChild(buttonElem);
    }

    // label
    let labelElem = document.createElement("a");
    labelElem.href = "#";
    let labelId = "ol-lab-" + object.id;
    labelElem.id = labelId;
    labelElem._selected = false;
    labelElem._cut = false;
    this.updateLabel(labelElem, object);
    labelElem.addEventListener("click", labelListener);
    itemElem.appendChild(labelElem);

    // children
    if (hasChildren)
    {
      // ul
      let listId = "ol-ul-" + object.id;
      let listElem = document.createElement("ul");
      listElem.id = listId;
      listElem.className = "collapsed";
      itemElem.appendChild(listElem);

      for (let i = 0; i < object.children.length; i++)
      {
        let child = object.children[i];
        this.populateList(child, listElem);
      }
    }
  }

  updateSelection()
  {
    // clear selection
    for (let i = 0; i < this.selectedLabels.length; i++)
    {
      let labelElem = this.selectedLabels[i];
      labelElem._selected = false;
      this.updateLabelStyle(labelElem);
    }
    // show new selection
    let selection = this.application.selection;
    let objects = selection.objects;
    this.selectedLabels = [];
    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      let labelId = "ol-lab-" + object.id;
      let selectedLabel = document.getElementById(labelId);
      if (selectedLabel)
      {
        this.selectedLabels.push(selectedLabel);
        selectedLabel._selected = true;
        this.updateLabelStyle(selectedLabel);
      }
    }
    // scroll and expand last selected object
    if (this.selectedLabels.length > 0)
    {
      let object = objects[objects.length - 1];
      let selectedLabel = this.selectedLabels[this.selectedLabels.length - 1];
      this.expandObject(object);

      if (selectedLabel !== this.lastSelectedLabel)
      {
        selectedLabel.scrollIntoView(false);
        this.bodyElem.scrollLeft = 0;
        this.lastSelectedLabel = selectedLabel;
      }
    }
  }

  expandObject(object)
  {
    var curr = object.parent;
    while (curr)
    {
      var id = curr.id;
      var childrenElem = document.getElementById("ol-ul-" + id);
      var buttonElem = document.getElementById("ol-but-" + id);
      childrenElem.className = "expanded";
      buttonElem.className = "collapse";
      curr = curr.parent;
    }
  }

  selectObjectById(objectId, event)
  {
    const application = this.application;
    const selection = application.selection;
    let object = application.scene.getObjectById(objectId, true);
    if (object)
    {
      application.selectObjects(event, [object]);
      this.updateSelection();
    }
    else
    {
      selection.clear();
      this.updateSelection();
    }
  }

  childCount(object)
  {
    var count = 0;
    var children = object.children;
    for (var i = 0; i < children.length; i++)
    {
      var child = children[i];
      if (child.name === null ||
          child.name.indexOf(THREE.Object3D.HIDDEN_PREFIX) !== 0) count++;
    }
    return count;
  }

  updateLabel(labelElem, object)
  {
    var objectName = object.name;
    if (objectName === null || object.name.trim().length === 0)
    {
      objectName = object.id;
    }
    labelElem.innerHTML = objectName;
    labelElem._visible = object.visible;
    if (object === this.application.camera)
    {
      labelElem._activeCamera = true;
      this.activeCameraLabel = labelElem;
    }
    this.updateLabelStyle(labelElem);
  }

  updateLabelStyle(labelElem)
  {
    var classNames = [];
    if (labelElem._typeClass)
    {
      classNames.push(labelElem._typeClass);
    }
    if (labelElem._selected)
    {
      classNames.push("selected");
    }
    if (labelElem._activeCamera)
    {
      classNames.push("active_camera");
    }
    if (labelElem._cut)
    {
      classNames.push("cut");
    }
    if (!labelElem._visible)
    {
      classNames.push("hidden");
    }
    labelElem.className = classNames.join(" ");
  }
}

export { Outliner };