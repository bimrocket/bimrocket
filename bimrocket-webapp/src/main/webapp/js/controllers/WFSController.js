/*
 * WFSController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { GMLLoader } from "../io/gis/GMLLoader.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { GeometryMerger } from "../builders/GeometryMerger.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { GeoJSONLoader } from "../io/gis/GeoJSONLoader.js";
import * as THREE from "../lib/three.module.js";

class WFSController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "https://your_server.com/wfs";
    this.username = "username";
    this.password = "password";
    this.layer = "layer";
    this.format = "GeoJSON";
    this.bbox = "";
    this.cqlFilter = "";
    this.count = 0;
    this.srsName = "";
    this.mergeGeometries = false;
    this.origin = new THREE.Vector3(420878, 4582247, 0);
    this.autoStart = false;

    this._onLoad = this.onLoad.bind(this);
    this._onProgress = this.onProgress.bind(this);
    this._onError = this.onError.bind(this);
  }

  onStart()
  {
    this.getFeature();
  }

  onStop()
  {
  }

  onLoad(featureGroup)
  {
    console.info("Feature " + this.layer + " loaded.");
    const oldFeatureGroup = this.object.getObjectByName("features");
    if (oldFeatureGroup)
    {
      ObjectUtils.dispose(oldFeatureGroup);
      this.object.remove(oldFeatureGroup);
    }
    featureGroup.updateMatrix();
    if (this.mergeGeometries)
    {
      const mergeGroup = new THREE.Group();
      mergeGroup.builder = new GeometryMerger();
      mergeGroup.add(featureGroup);
      ObjectBuilder.build(mergeGroup);
      featureGroup = mergeGroup;
    }

    this.object.add(featureGroup);
    featureGroup.name = "features";
    if (featureGroup.userData.export === undefined)
    {
      featureGroup.userData.export = {};
      featureGroup.userData.export.export = false;
    }
    featureGroup.userData.export.exportChildren = false;

    this.application.notifyObjectsChanged(this.object, this, "structureChanged");
  }

  onProgress()
  {
  }

  onError()
  {
  }

  getFeature()
  {
    let url = this.url;
    if (url.trim().length === 0) return;

    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }

    let layer = this.layer;
    let format = this.format || "GeoJSON";
    let loader;
    if (format === "GML")
    {
      loader = new GMLLoader();
    }
    else
    {
      loader = new GeoJSONLoader();
    }
    if (url.indexOf("?") === -1)
    {
      url += "?";
    }
    else
    {
      url += "&";
    }
    url += "service=wfs&version=2.0.0&request=GetFeature&outputFormat=" +
      loader.mimeType + "&typeName=" + layer;
    const count = this.count;
    if (count > 0)
    {
      url += "&count=" + count;
    }
    const bbox = this.bbox;
    if (bbox && bbox.length > 0)
    {
      url += "&bbox=" + bbox;
    }
    const cqlFilter = this.cqlFilter;
    if (cqlFilter && cqlFilter.length > 0)
    {
      url += "&CQL_FILTER=" + cqlFilter;
    }
    const srsName = this.srsName;
    if (srsName && srsName.length > 0)
    {
      url += "&srsName=" + srsName;
    }
    loader.options = {
      name: layer || "wfs",
      username: this.username,
      password: this.password,
      origin: this.origin,
      representation: this.object.getObjectByName("representation")
    };

    loader.load(url, this._onLoad, this._onProgress, this._onError);
  }

  static getDescription()
  {
    return "gis|controller." + this.name;
  }
}

Controller.addClass(WFSController);

export { WFSController };