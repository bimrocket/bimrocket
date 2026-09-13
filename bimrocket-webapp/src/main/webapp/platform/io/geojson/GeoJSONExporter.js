/**
 * GeoJSONExporter.js
 *
 * @author realor
 */

import { GISExporter } from "platform/io/GISExporter.js";
import { Solid } from "platform/core/Solid.js";
import * as THREE from "three";

class GeoJSONExporter extends GISExporter
{
  parse(object, options)
  {
    super.parse(object, options);

    const geojson = {
     "type": "FeatureCollection",
     "features": []
    };

    this.exportObject(object, new THREE.Matrix4(), geojson);

    return JSON.stringify(geojson);
  }

  addFeature(geomType, coords, properties, geojson)
  {
    const feature =
    {
      "type": "Feature",
      "geometry": { "type": geomType, coordinates: coords },
      "properties": properties
    };
    geojson.features.push(feature);
  }
}

export { GeoJSONExporter };