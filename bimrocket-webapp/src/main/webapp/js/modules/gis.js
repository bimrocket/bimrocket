/**
 * gis.js
 *
 * @author realor
 */

import { GeoJSONLoader } from "../io/gis/GeoJSONLoader.js";
import { IOManager } from "../io/IOManager.js";

export function load(application)
{
  // register formats
  IOManager.formats["geojson"] =
  {
    description : "GeoJSON (*.geojson)",
    extension: "json",
    loaderClass : GeoJSONLoader,
    options : {}
  };  
}