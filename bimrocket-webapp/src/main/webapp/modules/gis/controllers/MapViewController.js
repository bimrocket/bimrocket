/**
 * MapViewController.js
 *
 * @author nexus
 * @author realor
 */

import { Controller } from "platform/controllers/Controller.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { MapView, MapProvider, LODFrustum, LODRaycast, UnitsUtils,
         OpenStreetMapsProvider, GoogleMapsProvider, BingMapsProvider,
         MapBoxProvider, HereMapsProvider, MapTilerProvider,
         OpenMapTilesProvider } from "../lib/geo-three.module.js";
import { toUtm, fromUtm } from "../lib/utm-lonlat.js";

import { MapBoxHeightProvider } from "../io/MapBoxHeightProvider.js";
import { WMSProvider } from "../io/WMSProvider.js";
import { RateLimiter } from "platform/utils/RateLimiter.js";
import * as THREE from "three";

const MAP_PROVIDERS =
{
  "OpenStreetMapsProvider": OpenStreetMapsProvider,
  "GoogleMapsProvider": GoogleMapsProvider,
  "BingMapsProvider": BingMapsProvider,
  "MapBoxProvider": MapBoxProvider,
  "HereMapsProvider": HereMapsProvider,
  "MapTilerProvider": MapTilerProvider,
  "OpenMapTilesProvider": OpenMapTilesProvider,
  "MapBoxHeightProvider": MapBoxHeightProvider,
  "WMSProvider": WMSProvider
};

class MapViewController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.mapMode = "PLANAR"; // PLANAR, SPHERICAL, HEIGHT, HEIGHT_SHADER, MARTINI
    this.provider = "OpenStreetMapsProvider";
    this.heightProvider = "";
    this.utmZoneNumber = 0; // 0: web mercator
    this.utmZoneLetter = "";
    this.zOffset = 0;
    this.maxRequestsPerSecond = 100;

    this._mapView = null;
    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._lastParameters = null;
    this._rateLimiter = new RateLimiter(this.maxRequestsPerSecond, 200);
  }

  onStart()
  {
    this.application.addEventListener("scene", this._onNodeChanged);
    this.updateMap();
    this._rateLimiter.maxTasksPerSecond = this.maxRequestsPerSecond;
    this._rateLimiter.start();
  }

  onStop()
  {
    this.application.removeEventListener("scene", this._onNodeChanged);
    this.removeMap();
    this._rateLimiter.stop();
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      if (this.parametersChanged())
      {
        this.updateMap();
      }
    }
  }

  updateMap()
  {
    this.removeMap();

    try
    {
      const application = this.application;
      const object = this.object;

      let mapView = null;

      const mode = MapView[this.mapMode];
      if (!mode) throw "Invalid map mode: " + this.mapMode;

      const provider = this.createProvider(this.provider);
      const heightProvider = this.heightProvider ?
        this.createProvider(this.heightProvider, true) : null;
      const controlProvider = new ControlMapProvider(this, provider);

      mapView = new MapView(mode, controlProvider, heightProvider);
      mapView.name = "MapView";
      mapView.lod = new LODFrustum();
      mapView.subDivisionsRays = 64;

      ObjectUtils.setGhost(mapView, true);
      ObjectUtils.setExportable(mapView, false);

      this._mapView = mapView;

      if (this.utmZoneNumber > 0 && this.utmZoneLetter !== "")
      {
        const box = ObjectUtils.getLocalBoundingBox(application.baseObject);
        if (box.isEmpty())
        {
          this.applyWebMercatorMatrix(object);
        }
        else
        {
          const center = new THREE.Vector3();
          box.getCenter(center);
          this.applyUTMMatrix(object, center.x, center.y);
        }
      }
      else
      {
        this.applyWebMercatorMatrix(object);
      }
      object.updateMatrix();
      object.updateMatrixWorld(true);

      application.addObject(mapView, object);
    }
    catch (err)
    {
      console.error("Error initializing MapView:", err);
    }
  }

  removeMap()
  {
    if (this._mapView)
    {
      this.application.removeObject(this._mapView);
      this._mapView = null;
      this._lastParameters = null;
    }
  }

  parametersChanged()
  {
    let parameters = JSON.stringify([
      this.mapMode, this.provider, this.heightProvider,
      this.utmZoneNumber, this.utmZoneLetter, this.object.userData
    ]);

    let changed = parameters !== this._lastParameters;

    this._lastParameters = parameters;

    return changed;
  }

  createProvider(providerClassName, isHeightProvider = false)
  {
    const providerClass = MAP_PROVIDERS[providerClassName];
    if (!providerClass) throw "Invalid provider: " + this.provider;

    const provider = new providerClass();
    let setupName = this.name + "_" + providerClassName;
    if (isHeightProvider)
    {
      setupName += "_height";
    }
    const userData = this.object.userData;
    let setup = userData[setupName];
    if (setup)
    {
      this.copyProperties(setup, provider);
    }
    else
    {
      setup = {};
      this.copyProperties(provider, setup);
      this.object.userData[setupName] = setup;
      this.application.notifyObjectsChanged(this.object, this);
    }
    if (typeof provider.createSession === "function")
    {
      // some providers create a session in constructor (GoogleMapsProvider)
      provider.createSession();
    }
    return provider;
  }

  copyProperties(fromObject, toObject)
  {
    for (let key in fromObject)
    {
      if (key.startsWith("_")) continue;

      let value = fromObject[key];
      let type = typeof value;
      if (type === "string" || type === "number" || type === "boolean")
      {
        toObject[key] = value;
      }
    }
  }

  applyUTMMatrix(object, easting, northing)
  {
    const h = 1.0;

    const utmToWM = (easting, northing) =>
    {
      const ll = fromUtm(easting, northing, this.utmZoneNumber, this.utmZoneLetter);
      return  UnitsUtils.datumsToSpherical(ll.latitude, ll.longitude);
    };

    const E0 = easting;
    const N0 = northing;

    const E1 = easting + h;
    const N1 = northing + h;

    const v = new THREE.Vector3(E1 - E0, N1 - N0, 0);

    const wm0 = utmToWM(E0, N0);
    const wm1 = utmToWM(E1, N1);

    const u = new THREE.Vector3(wm1.x - wm0.x, wm1.y - wm0.y, 0);

    const vmod = v.length(); // UTM vector length
    const umod = u.length(); // WM vector length

    const scale = vmod / umod;

    const rotation = -Math.acos((u.x * v.y + u.y * v.y) / (vmod * umod));

    const matrix = new THREE.Matrix4().makeTranslation(E0, N0, this.zOffset)
      .multiply(new THREE.Matrix4().makeRotationZ(rotation))
      .multiply(new THREE.Matrix4().makeScale(scale, scale, 1))
      .multiply(new THREE.Matrix4().makeTranslation(-wm0.x, -wm0.y, 0))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

    matrix.decompose(object.position, object.quaternion, object.scale);
  }

  applyWebMercatorMatrix(object)
  {
    object.position.set(0, 0, this.zOffset);
    object.rotation.x = Math.PI / 2;
    object.scale.set(1, 1, 1);
  }

  static getDescription()
  {
    return "gis|controller.MapViewController";
  }
}

class ControlMapProvider extends MapProvider
{
  constructor(controller, provider)
  {
    super();
    this.controller = controller;
    this.provider = provider; // actual provider
    this.minZoom = provider.minZoom;
    this.maxZoom = provider.maxZoom;
  }

  fetchTile(zoom, x, y)
  {
    const controller = this.controller;
    return controller._rateLimiter.schedule(() =>
    {
      return new Promise((resolve, reject) =>
      {
        this.provider.fetchTile(zoom, x, y)
         .then(result => {
           resolve(result);
           // repaint the scene to show the fetched tile
           controller.application.repaint();
        })
        .catch(error => reject(error));
      });
    });
  }

  getMetaData()
  {
    return this.provider.getMetaData();
  }
}

Controller.addClass(MapViewController);


export { MapViewController };