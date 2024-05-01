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
    this.minColor = new THREE.Color(0.5, 0.5, 0.5);
    this.maxColor = new THREE.Color(1, 1, 0);
    this.minValue = 0;
    this.maxValue = 1;
    this.emissive = 0;
    this.opacity = 1;

    this._material = new THREE.MeshPhongMaterial({
      name: "ColorControllerMaterial",
      color: new THREE.Color(0.5, 0.5, 0.5),
      emissive: 0xFFFFFF, emissiveIntensity: 0.0,
      transparent: false, opacity: 1,
      side: THREE.DoubleSide});

    this._materialMap = new Map();
    this._onNodeChanged = this.onNodeChanged.bind(this);
  }

  onStart()
  {
    this.replaceMaterial();
    this.updateColor(true);
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
      this.updateColor(false);
    }
  }

  updateColor(force)
  {
    if (typeof this.input !== "number")
    {
      this.input = this.minValue;
    }

    let value = this.input;

    let color = null;
    let minValue = this.minValue;
    let maxValue = this.maxValue;
    let minColor = this.minColor;
    let maxColor = this.maxColor;
    let opacity = this.opacity;

    let factor;
    if (value <= minValue)
    {
      color = minColor;
      factor = 0;
    }
    else if (value >= maxValue)
    {
      color = maxColor;
      factor = 1;
    }
    else // interpolate color
    {
      factor = (value - minValue) / (maxValue - minValue); // [0..1]
      color = minColor.clone();
      color.lerp(maxColor, factor);
    }

    if (force || this._material.color.getHex() !== color.getHex()
              || this._material.opacity !== opacity)
    {
      this._material.color.copy(color);
      this._material.emissiveIntensity = factor * this.emissive;
      this._material.opacity = opacity;
      this._material.transparent = opacity < 1;
      this.application.notifyObjectsChanged(this.object, this);
    }
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