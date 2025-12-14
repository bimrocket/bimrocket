/**
 * gis.js
 *
 * @author realor
 */

import { GeoJSONLoader } from "../io/gis/GeoJSONLoader.js";
import { GMLLoader } from "../io/gis/GMLLoader.js";
import { ASCIIGridLoader } from "../io/gis/ASCIIGridLoader.js";
import { OnTerrainPositioner } from "../builders/OnTerrainPositioner.js";
import { OnTerrainExtruder } from "../builders/OnTerrainExtruder.js";
import { IOManager } from "../io/IOManager.js";
import { WFSController } from "../controllers/WFSController.js";
import { MapViewController } from "../controllers/MapViewController.js";
import { BundleManager } from "../i18n/BundleManager.js";

export function load(application)
{
  // register formats
  IOManager.formats["geojson"] =
  {
    description : "GeoJSON (*.geojson)",
    extensions: ["geojson"],
    mimeType : "application/geo+json",
    dataType : "text",
    loader :
    {
      class : GeoJSONLoader,
      loadMethod : 0
    }
  };

  IOManager.formats["gml"] =
  {
    description : "GML (*.gml)",
    extensions: ["gml"],
    mimeType : "application/gml+xml",
    dataType : "text",
    loader :
    {
      class : GMLLoader,
      loadMethod : 0
    }
  };

  IOManager.formats["grd"] =
  {
    description : "ASCII Grid (*.grd, *.asc)",
    extensions: ["grd", "asc"],
    mimeType : "text/plain",
    dataType : "text",
    loader :
    {
      class : ASCIIGridLoader,
      loadMethod : 2
    }
  };

  // load bundles
  BundleManager.setBundle("base", "i18n/base");
  BundleManager.setBundle("gis", "i18n/gis");
  application.i18n.defaultBundle = BundleManager.getBundle("base");
  application.i18n.addSupportedLanguages("en", "es", "ca");
  application.i18n.updateTree(application.element);
}

