/*
 * ProximityController.js
 *
 * @author: realor
 */

import { Controller } from "./Controller.js";
import { ControllerManager } from "./ControllerManager.js";
import * as THREE from "../lib/three.module.js";

class ProximityController extends Controller
{
  static type = "ProximityController";
  static description = "Detects proximity to objects.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.distance = this.createProperty("number", "Distance", 3);
    this.output = this.createProperty("number", "Output flag");
    this.objects = this.createProperty("string", "Objects group");

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._vector1 = new THREE.Vector3();
    this._vector2 = new THREE.Vector3();
  }

  onStart()
  {
    const application = this.application;
    this._objects = application.scene.getObjectByName(this.objects.value);
    console.info("OBJECTS:" + this._objects);
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
            let range = parseFloat(this.distance.value || 1);
            let value = this.output.value;
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
              this.output.value = newValue;
            }
          }
        }
      }
      else // camera
      {
        var camera = this.application.camera;
        if (event.objects.includes(camera) ||
            event.objects.includes(this.object))
        {
          let range = parseFloat(this.distance.value || 1);
          let value = this.output.value;
          let newValue = this.isNearObject(camera, range) ? 1 : 0;
          if (newValue !== value)
          {
            this.output.value = newValue;
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

    var distance = this._vector1.distanceTo(this._vector2);

    return distance < range;
  }
}

ControllerManager.addClass(ProximityController);

export { ProximityController };