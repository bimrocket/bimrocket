/**
 * gis module
 *
 * @author realor
 */

import { GeoJSONLoader } from "platform/io/geojson/GeoJSONLoader.js";
import { GeoJSONExporter } from "platform/io/geojson/GeoJSONExporter.js";
import { GMLLoader } from "platform/io/gml/GMLLoader.js";
import { ASCIIGridLoader } from "platform/io/grd/ASCIIGridLoader.js";
import { OnTerrainPositioner } from "platform/builders/OnTerrainPositioner.js";
import { OnTerrainExtruder } from "platform/builders/OnTerrainExtruder.js";
import { IOManager } from "platform/io/IOManager.js";

import { WFSTool } from "./tools/WFSTool.js";
import { MapViewTool  } from "./tools/MapViewTool.js";

import { BundleManager } from "platform/i18n/BundleManager.js";
import { IconManager } from "platform/ui/IconManager.js";

export function activate(application)
{
  BundleManager.setBundle("gis", "./i18n/gis", import.meta);
  IconManager.setSprite("gis", "./assets/icons/misc.svg", import.meta);

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
    },
    exporter :
    {
      class : GeoJSONExporter
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

  // create tools
  const wfsTool = new WFSTool(application);
  const mapViewTool  = new MapViewTool(application);

  // create menus
  const menuBar = application.menuBar;

  const panelsMenu = menuBar.getMenu("base|menu.panels");

  const gisMenu = menuBar.addMenu("gis|menu.gis", panelsMenu?.getIndex());
  gisMenu.addMenuItem(wfsTool);
  gisMenu.addMenuItem(mapViewTool);
}

