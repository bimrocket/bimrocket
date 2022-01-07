/**
 * gis.js
 *
 * @author realor
 */

import { GeoJSONLoader } from "../io/gis/GeoJSONLoader.js";
import { ASCIIGridLoader } from "../io/gis/ASCIIGridLoader.js";
import { IOManager } from "../io/IOManager.js";
import { WFSController } from "../controllers/WFSController.js";
import { BundleManager } from "../i18n/BundleManager.js";

export function load(application)
{
  // register formats
  IOManager.formats["geojson"] =
  {
    description : "GeoJSON (*.geojson)",
    extensions: ["geojson"],
    loaderClass : GeoJSONLoader,
    options : {}
  };

  IOManager.formats["grd"] =
  {
    description : "ASCII Grid (*.grd, *.asc)",
    extensions: ["grd", "asc"],
    loaderClass : ASCIIGridLoader,
    loadMethod: 2,
    options : {}
  };

  // load bundles
  BundleManager.setBundle("base", "i18n/base");
  BundleManager.setBundle("gis", "i18n/gis");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);
}

