/*
 * ColorController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { Solid } from "../core/Solid.js";
import * as THREE from "../lib/three.module.js";

class ColorController extends Controller
{
  constructor(object, name)
  {
    super(object, name);
    this.input = 0;
    this.minColor = "#808080";
    this.maxColor = "#FFFF00";
    this.minValue = 0;
    this.maxValue = 1;
    this.emissive = 0;

    this._material = new THREE.MeshPhongMaterial({
      color: 0xFFFF00, emissive: 0xFFFFFF, emissiveIntensity : 0.0,
      side: THREE.DoubleSide});

    this._materialMap = new Map();
    this._onNodeChanged = this.onNodeChanged.bind(this);
  }

  onStart()
  {
    this.replaceMaterial();
    this.updateColor(this.input, true);
    this.application.addEventListener("scene", this._onNodeChanged);
  }

  onStop()
  {
    this.restoreMaterial();
    this.application.removeEventListener("scene", this._onNodeChanged);
    this.application.notifyObjectsChanged(this.object, this);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      this.updateColor(this.input, false);
    }
  }

  updateColor(value, force)
  {
    let color = null;
    let minValue = this.minValue;
    let maxValue = this.maxValue;
    let minColor = this.minColor;
    let maxColor = this.maxColor;

    let factor;
    if (value <= minValue)
    {
      color = this.parseColor(minColor);
      factor = 0;
    }
    else if (value >= maxValue)
    {
      color = this.parseColor(maxColor);
      factor = 1;
    }
    else // interpolate color
    {
      factor = (value - minValue) / (maxValue - minValue); // [0..1]
      color = this.parseColor(minColor);
      color.lerp(this.parseColor(maxColor), factor);
    }

    if (force || this._material.color.getHex() !== color.getHex())
    {
      this._material.color = color;
      this._material.emissiveIntensity = factor * this.emissive;
      this.application.notifyObjectsChanged(this.object, this);
    }
  }

  parseColor(colorString)
  {
    let color = new THREE.Color();
    color.set(colorString);
    return color;
  }

  replaceMaterial()
  {
    let material = this._material;
    let materialMap = this._materialMap;

    this.object.traverse(object =>
    {
      if (object instanceof Solid)
      {
        materialMap[object] = object.material;
        object.material = material;
      }
    });
  }

  restoreMaterial()
  {
    let materialMap = this._materialMap;

    this.object.traverse(object =>
    {
      if (object instanceof Solid)
      {
        let oldMaterial = materialMap[object];
        if (oldMaterial)
        {
          if (object.material) object.material.dispose();
          object.material = oldMaterial;
        }
      }
    });
    materialMap.clear();
  }
}

Controller.addClass(ColorController);

export { ColorController };