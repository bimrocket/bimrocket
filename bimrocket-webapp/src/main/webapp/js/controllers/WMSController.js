/**
 * WMSController.js
 *
 * @author nexus, realor
 */

import { Controller } from "./Controller.js";
import { WMSProvider } from "../io/gis/WMSProvider.js";
import * as THREE from "three";
import { MapView, MapBoxProvider } from "geo-three";
import proj4 from 'proj4';

// Projecció Web Mercator (EPSG:3857)
if (!proj4.defs["EPSG:3857"]) {
  proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs");
}

// Projecció UTM zona 31N (EPSG:25831)
if (!proj4.defs["EPSG:25831"]) {
  proj4.defs("EPSG:25831", "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
}

const CRS = "EPSG:3857";

class WMSController extends Controller
{
  constructor(object, name)
  {
    super(object, name);
    this.url = "";
    this.layers = "";
    this.useMapboxHeight = false;
    this.mapboxApiKey = "";

    this._mapView = null;
    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._onChange = this.onChange.bind(this);

    this._lastUrl = null;
    this._lastLayers = null;
    this._lastUseMapboxHeight = false;
    this._lastMapboxApiKey = null;
    this._lastOrigin = new THREE.Vector2();

    this.autoStart = true;
    this._isAnimating = false;
  }

  onStart()
  {
    this.application.addEventListener("scene", this._onNodeChanged);
    this.application.addEventListener("change", this._onChange);
    this.updateMap();
  }

  onStop()
  {
    this.application.removeEventListener("scene", this._onNodeChanged);
    this.application.removeEventListener("change", this._onChange);
    this.removeMap();
  }

  onChange(event)
  {
    const application = this.application;
    const camera = application.camera;

    if (event.type === "nodeChanged" &&
        event.objects.includes(camera))
    {
      this.updateTiles(camera);
    }
  }

  updateTiles(camera)
  {
    if (this._mapView)
    {
      this._mapView.updateMatrixWorld(camera);
    }
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      if (this.url !== this._lastUrl ||
          this.layers !== this._lastLayers ||
          this.useMapboxHeight !== this._lastUseMapboxHeight ||
          this.mapboxApiKey !== this._lastMapboxApiKey)
      {
        if (this.layers !== this._lastLayers && this.layers)
        {
          this.object.name = "WMS Layer - " + this.layers;
          this.application.notifyObjectsChanged(this.object, this, "nameChanged");
        }
        this.updateMap();
      }
    }
  }

  updateMap()
  {
    this.removeMap();

    if (!this.url || !this.layers) return;

    this._lastUrl = this.url;
    this._lastLayers = this.layers;
    this._lastUseMapboxHeight = this.useMapboxHeight;
    this._lastMapboxApiKey = this.mapboxApiKey;

    if (this.layers)
    {
      this.object.name = "WMS Layer - " + this.layers;
    }

    try
    {
      const application = this.application;
      const camera = application.camera;
      const provider = new WMSProvider(this.url, this.layers, CRS, "image/png", true, () => application.repaint());

      let heightProvider = null;
      let mapView = null;

      if (this.useMapboxHeight) {
        heightProvider = new MapBoxProvider(
          this.mapboxApiKey,
          "mapbox.terrain-rgb",
          MapBoxProvider.MAP_ID,
          "pngraw"
        );
        mapView = new MapView(MapView.HEIGHT, provider, heightProvider);
      } else {
        mapView = new MapView(MapView.PLANAR, provider, camera);
      }

      provider.minZoom = 13;
      camera.position.z += 0.00001;
      mapView.name = "MapView";
      mapView.subDivisionsRays = 64;

      this._mapView = mapView;

      this.object.add(this._mapView);

      this.object.rotation.x = Math.PI/2;
      this.object.position.set
      (
          253,
          5668,
          -1.5
      );
      this.object.updateMatrix();
      this.object.updateMatrixWorld(true);

      application.notifyObjectsChanged(this.object, this);
    } 
    catch (err)
    {
      console.error("Error updating WMS map:", err);
    }
  }

  removeMap()
  {
    if (this._mapView) {
        if (this._mapView.dispose)
        {
          this._mapView.dispose();
        }
        this._mapView.removeFromParent();
        this._mapView = null;
        this.application.notifyObjectsChanged(this.object, this, "structureChanged");
    }
  }

  static getDescription()
  {
    return "gis|controller.WMSController";
  }
}

Controller.addClass(WMSController);

export { WMSController };