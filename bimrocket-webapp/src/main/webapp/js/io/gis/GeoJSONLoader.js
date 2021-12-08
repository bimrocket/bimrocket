/**
 * GeoJSONLoader.js
 *
 * @author realor
 */

import { GISLoader } from "./GISLoader.js";
import { Solid } from "../../core/Solid.js";
import { BooleanOperator } from "../../builders/BooleanOperator.js";
import * as THREE from "../../lib/three.module.js";

class GeoJSONLoader extends GISLoader
{
  constructor(manager)
  {
    super(manager, "application/json");
  }

  parse(data)
  {
    const options = this.options;
    const featureGroup = new THREE.Group();
    featureGroup.name = this.options.name || "layer";
    let jsonObject = JSON.parse(data);
    let features = jsonObject.features;
    for (let f = 0; f < features.length; f++)
    {
      let feature = features[f];
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
    return featureGroup;
  }
}

export { GeoJSONLoader };
