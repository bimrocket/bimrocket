/*
 * Tool.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";
import { I18N } from "../i18n/I18N.js";

class Tool
{
  constructor(application)
  {
    this.application = application;
    this.name = "command"; // must be unique
    this.label = "Command";
    this.help = "command help";
    this.className = "command";
    this.immediate = false;
  }

  activate()
  {
    console.info("activate " + this.id);
  }

  deactivate()
  {
    console.info("deactivate " + this.id);
  }

  execute()
  {
    console.info("execute " + this.id);
  }

  setOptions(options)
  {
    if (options)
    {
      for (var option in options)
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
    raycaster.far = Math.Infinity;
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
        if (this.isPathVisible(object)) firstIntersect = intersect;
      }
      i++;
    }
    return firstIntersect;
  }

  isPathVisible(object)
  {
    while (object !== null && object.visible)
    {
      object = object.parent;
    }
    return object === null;
  }

  getEventPosition(event)
  {
    const x = event.offsetX || event.layerX;
    const y = event.offsetY || event.layerY;
    return new THREE.Vector2(x, y);
  }

  isCanvasEvent(event)
  {
    if (this.application.menuBar.armed) return false;

    const target = event.target;
    return target.nodeName.toLowerCase() === "canvas";
  }
}

export { Tool };

