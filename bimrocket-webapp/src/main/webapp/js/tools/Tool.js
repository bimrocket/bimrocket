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

    let ray, origin, vector;
    if (camera instanceof THREE.OrthographicCamera)
    {
      vector = new THREE.Vector3(pointercc.x, pointercc.y, 0); // NDC
      vector.unproject(camera); // world

      origin = new THREE.Vector3();
      camera.localToWorld(origin); // world
      let viewVector = new THREE.Vector3(0, 0, -1);
      camera.localToWorld(viewVector); // world
      ray = viewVector.sub(origin);
      origin = vector;
      origin.x -= 1000 * ray.x;
      origin.y -= 1000 * ray.y;
      origin.z -= 1000 * ray.z;
    }
    else // THREE.PerspectiveCamera
    {
      vector = new THREE.Vector3(pointercc.x, pointercc.y, 0); // NDC
      vector.unproject(camera); // world
      origin = new THREE.Vector3();
      camera.localToWorld(origin);
      ray = vector.sub(origin);
    }
    raycaster.set(origin, ray.normalize());
    raycaster.far = Math.Infinity;

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

    const target = event.target || event.srcElement;
    return target.nodeName.toLowerCase() === "canvas";
  }
}

export { Tool };

