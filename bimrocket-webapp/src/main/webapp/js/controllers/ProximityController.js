/*
 * ProximityController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import * as THREE from "three";

class ProximityController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.distance = 3;
    this.output = 0;
    this.objectsGroup = "";

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._objects = null;
    this._vector1 = new THREE.Vector3();
    this._vector2 = new THREE.Vector3();
  }

  onStart()
  {
    const application = this.application;
    if (this.objectsGroup && this.objectsGroup.length > 0)
    {
      this._objects = application.scene.getObjectByName(this.objectsGroup);
      console.info("OBJECTS:" + this._objects);
    }
    application.addEventListener("scene", this._onNodeChanged);
  }

  onStop()
  {
    const application = this.application;
    application.removeEventListener("scene", this._onNodeChanged);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged")
    {
      if (this._objects)
      {
        for (let object of event.objects)
        {
          if (object.parent === this._objects)
          {
            let range = parseFloat(this.distance || 1);
            let value = this.output;
            let newValue = 0;
            let children = this._objects.children;
            let i = 0;
            while (i < children.length && newValue === 0)
            {
              let child = children[i];
              if (this.isNearObject(child, range)) newValue = 1;
              i++;
            }
            if (newValue !== value)
            {
              this.output = newValue;
              this.application.notifyObjectsChanged(this.object, this);
            }
          }
        }
      }
      else // camera
      {
        const camera = this.application.camera;
        if (event.objects.includes(camera) ||
            event.objects.includes(this.object))
        {
          let range = parseFloat(this.distance || 1);
          let value = this.output;
          let newValue = this.isNearObject(camera, range) ? 1 : 0;
          if (newValue !== value)
          {
            this.output = newValue;
            this.application.notifyObjectsChanged(this.object, this);
          }
        }
      }
    }
  }

  isNearObject(other, range)
  {
    this._vector1.set(0, 0, 0);
    other.localToWorld(this._vector1);

    this._vector2.set(0, 0, 0);
    this.object.localToWorld(this._vector2);

    const distance = this._vector1.distanceTo(this._vector2);

    return distance < range;
  }
}

Controller.addClass(ProximityController);

export { ProximityController };