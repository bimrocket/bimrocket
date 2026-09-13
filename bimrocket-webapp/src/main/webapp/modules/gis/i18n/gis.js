/**
 * gis.js
 *
 * @author realor
 */

export const translations =
{
  "menu.gis": "GIS",

  "tool.wfs.label": "Add WFS layer",
  "tool.wfs.help": "Load data from Web Feature Service",

  "tool.map_view.label": "Add map view",
  "tool.map_view.help": "Load tiles from Map Service",

  "label.wfs.type": "Select WFS type:",
  "label.wfs.layer_name": "Layer name:",
  "label.wfs.url": "WFS URL:",
  "label.wfs.geometry_type": "Geometry format:",
  "label.wfs.limit_distance": "Geometry load limit:",
  "label.wfs.limit_distance_help": "Distance in 'm' or 'km' according to the existing IFC model. If there is no IFC, it does not apply.",
  "label.wfs.srs_name": "Coordinate system:",
  "label.wfs.srs_name_help": "Ex. EPSG:3857",
  "label.wfs.extrusion": "Extrusion",
  "label.wfs.extrusion_depth": "Extrusion depth (meters):",

  "label.map_view.provider": "Provider:",
  "label.map_view.map_mode": "Map mode:",
  "label.map_view.utm_zone": "UTM zone (0 for Global Mercator):",
  "label.map_view.height_provider": "Provider for height",
  "label.map_view.provider_key": "Provider key:",
  "label.map_view.height_provider_key": "Height provider key:",
  "label.map_view.wms_url": "WMS URL:",
  "label.map_view.wms_layer": "WMS Layer:",
  "label.map_view.max_requests_per_second": "Max requests per second:",

  "option.wfs.geometry_polygon": "Polygon",
  "option.wfs.geometry_line": "Line",
  "option.wfs.geojson": "GeoJSON",
  "option.wfs.gml2": "GML2",
  "option.wfs.gml3": "GML3",
  "option.wfs.gml32": "GML32",

  "option.map_view.openstreetmap": "OpenStreetMap",
  "option.map_view.googlemaps": "Google Maps",
  "option.map_view.bingmaps": "Bing Maps",
  "option.map_view.mapbox": "MapBox",
  "option.map_view.heremaps": "HERE Maps",
  "option.map_view.maptiler": "MapTiler",
  "option.map_view.openmaptiles": "OpenMapTiles",
  "option.map_view.mapboxheight": "MapBox height",
  "option.map_view.wms": "WMS",
  "option.map_view.planar": "Planar",
  "option.map_view.spherical": "Spherical",
  "option.map_view.height": "Height",
  "option.map_view.height_shader": "Height shader",
  "option.map_view.martini": "Martini",

  "controller.WFSController": "Loads geometry from Web Feature Service.",
  "controller.MapViewController": "Loads tiles from a map server."
};
