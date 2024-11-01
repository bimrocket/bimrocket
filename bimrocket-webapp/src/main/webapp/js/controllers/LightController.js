/*
 * LightController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import * as THREE from "three";

class LightController extends Controller
{
  constructor(object, name)
  {
    super(object, name);
    this.input = 0;
    this.minValue = 0;
    this.maxValue = 1;
    this.intensity = 1;
    this.distance = 3;
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetZ = 0;

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._light = null;
  }

  onStart()
  {
    this.createLight();
    this.update(true);
    this.application.addEventListener("scene", this._onNodeChanged);
  }

  onStop()
  {
    this.destroyLight();
    this.application.removeEventListener("scene", this._onNodeChanged);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      this.update(false);
    }
  }

  update(force)
  {
    let value = this.input;
    let distance = this.distance;
    let minValue = this.minValue;
    let maxValue = this.maxValue;
    let offsetX = this.offsetX;
    let offsetY = this.offsetY;
    let offsetZ = this.offsetZ;

    let factor;
    if (value <= minValue)
    {
      factor = 0;
    }
    else if (value >= maxValue)
    {
      factor = 1;
    }
    else // interpolate factor
    {
      factor = (value - minValue) / (maxValue - minValue); // [0..1]
    }

    let intensity = factor * this.intensity;
    if (force ||
         this._light.intensity !== intensity ||
         this._light.distance !== distance ||
         this._light.position.x !== offsetX ||
         this._light.position.y !== offsetY ||
         this._light.position.z !== offsetZ)
    {
      this._light.intensity = intensity;
      this._light.distance = distance;
      this._light.position.set(offsetX, offsetY, offsetZ);
      this._light.updateMatrix();
      this.application.notifyObjectsChanged(this.object, this);
    }
  }

  createLight()
  {
    this._light = new THREE.PointLight(0xFFFFFF);
    const light = this._light;
    light.name = "light";
    light.userData.export = { export : false };
    this.application.addObject(light, this.object);
  }

  destroyLight()
  {
    this.application.removeObject(this._light, this.object);
    this._light = null;
  }
}

Controller.addClass(LightController);

export { LightController };