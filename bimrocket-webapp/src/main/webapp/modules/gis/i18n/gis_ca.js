/**
 * gis_ca.js
 *
 * @author realor
 */

export const translations =
{
  "menu.gis": "GIS",

  "tool.wfs.label": "Afegir capa WFS",
  "tool.wfs.help": "Carregar dades des de Web Feature Service",

  "tool.map_view.label": "Afegeix vista de mapa",
  "tool.map_view.help": "Carregar tessel·les des de Map Service",

  "label.wfs.type": "Selecciona tipus de WFS:",
  "label.wfs.layer_name": "Nom de la capa:",
  "label.wfs.url": "URL WFS:",
  "label.wfs.geometry_type": "Format de la geometria:",
  "label.wfs.limit_distance": "Límit de càrrega de geometries:",
  "label.wfs.limit_distance_help": "Distància en 'm' o 'km' segons el model IFC existent. Si no hi ha IFC, no aplica.",
  "label.wfs.srs_name": "Sistema de coordenades:",
  "label.wfs.srs_name_help": "Ex. EPSG:3857",
  "label.wfs.extrusion": "Extrusió",
  "label.wfs.extrusion_depth": "Profunditat d'extrusió (metres):",

  "label.map_view.provider": "Proveïdor:",
  "label.map_view.map_mode": "Mode del mapa:",
  "label.map_view.utm_zone": "Zona UTM (0 per Global Mercator):",
  "label.map_view.height_provider": "Proveïdor per a l'altura",
  "label.map_view.provider_key": "Clau del proveïdor:",
  "label.map_view.height_provider_key": "Clau del proveïdor d'altura:",
  "label.map_view.wms_url": "URL de WMS:",
  "label.map_view.wms_layer": "Capa de WMS:",
  "label.map_view.max_requests_per_second": "Màx. sol·licituds per segon:",

  "option.wfs.geometry_polygon": "Polígon",
  "option.wfs.geometry_line": "Línia",
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
  "option.map_view.mapboxheight": "Altura de MapBox",
  "option.map_view.wms": "WMS",
  "option.map_view.planar": "Pla",
  "option.map_view.spherical": "Esfèric",
  "option.map_view.height": "Altura",
  "option.map_view.height_shader": "Shader d'altura",
  "option.map_view.martini": "Martini",

  "controller.WFSController": "Carrega geometria d'un servei WFS.",
  "controller.MapViewController": "Carrega tessel·les d'un servidor de mapes."
};
