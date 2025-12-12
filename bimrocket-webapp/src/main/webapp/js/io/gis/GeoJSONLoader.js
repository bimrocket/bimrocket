/**
 * GeoJSONLoader.js
 *
 * @author realor
 */

import { GISLoader } from "./GISLoader.js";
import { Solid } from "../../core/Solid.js";
import { BooleanOperator } from "../../builders/BooleanOperator.js";
import * as THREE from "three";

class GeoJSONLoader extends GISLoader
{
  constructor(manager)
  {
    super(manager, "application/geo+json");
  }

  parse(data)
  {
    if (typeof data !== "string") throw "Unsupported data";

    const options = this.options;
    const featureGroup = new THREE.Group();
    featureGroup.name = this.options.name || "layer";
    let jsonObject = JSON.parse(data);
    let features = jsonObject.features;
    for (let feature of features)
    {
      let properties = feature.properties;
      let geometry = feature.geometry;
      if (geometry)
      {
        this.createObject(geometry.type, feature.id || "feature",
          geometry.coordinates, properties, featureGroup);
      }
      else
      {
        this.createNonVisibleObject(feature.id || "feature_nv",
          properties, featureGroup);
      }
    }

    featureGroup.position.copy(this.getOrigin());
    featureGroup.updateMatrix();

    return featureGroup;
  }
}

export { GeoJSONLoader };
