/**
 * gis_es.js
 *
 * @author realor
 */

export const translations =
{
  "menu.gis": "GIS",

  "tool.wfs.label": "Añadir capa WFS",
  "tool.wfs.help": "Cargar datos desde Web Feature Service",

  "tool.map_view.label": "Añadir vista de mapa",
  "tool.map_view.help": "Cargar teselas desde Map Service",

  "label.wfs.type": "Seleccionar tipo de WFS:",
  "label.wfs.layer_name": "Nombre de la capa:",
  "label.wfs.url": "URL WFS:",
  "label.wfs.geometry_type": "Formato de la geometría:",
  "label.wfs.limit_distance": "Límite de carga de geometrías:",
  "label.wfs.limit_distance_help": "Distancia en 'm' o 'km' según el modelo IFC existente. Si no hay IFC, no aplica.",
  "label.wfs.srs_name": "Sistema de coordenadas:",
  "label.wfs.srs_name_help": "Ej. EPSG:3857",
  "label.wfs.extrusion": "Extrusión",
  "label.wfs.extrusion_depth": "Profundidad de extrusión (metros):",

  "label.map_view.provider": "Proveedor:",
  "label.map_view.map_mode": "Modo del mapa:",
  "label.map_view.utm_zone": "Zona UTM (0 para Global Mercator):",
  "label.map_view.height_provider": "Proveedor para la altura",
  "label.map_view.provider_key": "Clave del proveedor:",
  "label.map_view.height_provider_key": "Clave del proveedor de altura:",
  "label.map_view.wms_url": "URL de WMS:",
  "label.map_view.wms_layer": "Capa de WMS:",
  "label.map_view.max_requests_per_second": "Máx. solicitudes por segundo:",

  "option.wfs.geojson": "GeoJSON",
  "option.wfs.gml2": "GML2",
  "option.wfs.gml3": "GML3",
  "option.wfs.gml32": "GML32",
  "option.wfs.geometry_polygon": "Polígono",
  "option.wfs.geometry_line": "Línea",

  "option.map_view.openstreetmap": "OpenStreetMap",
  "option.map_view.googlemaps": "Google Maps",
  "option.map_view.bingmaps": "Bing Maps",
  "option.map_view.mapbox": "MapBox",
  "option.map_view.heremaps": "HERE Maps",
  "option.map_view.maptiler": "MapTiler",
  "option.map_view.openmaptiles": "OpenMapTiles",
  "option.map_view.mapboxheight": "Altura de MapBox",
  "option.map_view.wms": "WMS",
  "option.map_view.planar": "Plano",
  "option.map_view.spherical": "Esferico",
  "option.map_view.height": "Altura",
  "option.map_view.height_shader": "Shader de altura",
  "option.map_view.martini": "Martini",

  "controller.WFSController": "Carga geometría de un servicio WFS.",
  "controller.MapViewController": "Carga teselas de un servidor de mapas."
};
