/*
 * Tool.js
 *
 * @author realor
 */

import { Action } from "../ui/Action.js";
import { I18N } from "../i18n/I18N.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class Tool extends Action
{
  constructor(application)
  {
    super();
    this.application = application;
    this.label = this.constructor.name;
    this.className = this.constructor.name;
    this.name = "command"; // must be unique
    this.help = "command help";
    this.className = "command";
    this.immediate = false;
  }

  getLabel()
  {
    return this.label;
  }

  getClassName()
  {
    return this.className;
  }

  perform()
  {
    this.application.useTool(this);
  }

  activate()
  {
    console.info("activate " + this.name);
  }

  deactivate()
  {
    console.info("deactivate " + this.name);
  }

  execute()
  {
    console.info("execute " + this.name);
  }

  setOptions(options)
  {
    if (options)
    {
      for (let option in options)
      {
        this[option] = options[option];
      }
    }
  }

  intersect(pointerPosition, baseObject, recursive)
  {
    const application = this.application;
    const camera = application.camera;
    const container = application.container;
    const raycaster = new THREE.Raycaster();

    let pointercc = new THREE.Vector2();
    pointercc.x = (pointerPosition.x / container.clientWidth) * 2 - 1;
    pointercc.y = -(pointerPosition.y / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(pointercc, camera);
    raycaster.camera = camera;
    raycaster.params.Line.threshold = 0.1;

    let intersects = raycaster.intersectObjects([baseObject], recursive);
    let i = 0;
    let firstIntersect = null;
    while (i < intersects.length && firstIntersect === null)
    {
      let intersect = intersects[i];
      let object = intersect.object;
      if (application.clippingPlane === null ||
          application.clippingPlane.distanceToPoint(intersect.point) > 0)
      {
        if (this.isSelectableObject(object)) firstIntersect = intersect;
      }
      i++;
    }
    return firstIntersect;
  }

  isSelectableObject(object)
  {
    while (object !== null)
    {
      let selectionEnabled = ObjectUtils.getSelectionEnabled(object);
      if (selectionEnabled === false)
      {
        return false;
      }
      else if (selectionEnabled !== true && !object.visible)
      {
        return false;
      }

      object = object.parent;
    }
    return true;
  }

  findActualSelectedObject(object)
  {
    let parent = object;
    while (parent)
    {
      let selectionGroup = ObjectUtils.getSelectionGroup(parent);
      if (selectionGroup === true)
      {
        return parent;
      }
      parent = parent.parent;
    }
    return object;
  }
}

export { Tool };

