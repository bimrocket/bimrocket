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
import { Formula } from "../formula/Formula.js";
import * as THREE from "../lib/three.module.js";

class WFSController extends Controller
{
  static FEATURES_NAME = "features";
  static REPRESENTATION_NAME = "representation";

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

  onLoad(group)
  {
    group.name = this.layer;

    // remove previous feature group
    const oldFeatureGroup =
      this.object.getObjectByName(WFSController.FEATURES_NAME);
    if (oldFeatureGroup)
    {
      ObjectUtils.dispose(oldFeatureGroup);
      this.object.remove(oldFeatureGroup);
    }

    const representation =
      this.object.getObjectByName(WFSController.REPRESENTATION_NAME);

    // create new feature group
    let featureGroup;

    if (representation)
    {
      featureGroup = new THREE.Group();
      featureGroup.name = this.layer;

      const features = [...group.children];
      group.clear();

      for (let feature of features)
      {
        let featureRepr = representation.clone();
        featureRepr.name = feature.name;
        featureRepr.userData = feature.userData;
        featureRepr.add(feature);
        featureRepr.visible = true;
        featureGroup.add(featureRepr);
        feature.userData = {};
      }
    }
    else
    {
      featureGroup = group;
    }

    if (this.mergeGeometries)
    {
      const mergeGroup = new THREE.Group();
      mergeGroup.builder = new GeometryMerger();
      mergeGroup.add(featureGroup);
      featureGroup = mergeGroup;
      featureGroup.updateMatrix();
    }

    this.object.add(featureGroup);
    featureGroup.name = WFSController.FEATURES_NAME;
    featureGroup.updateMatrix();

    Formula.updateTree(featureGroup);

    ObjectBuilder.build(featureGroup);

    if (featureGroup.userData.export === undefined)
    {
      featureGroup.userData.export = {};
      featureGroup.userData.export.export = false;
    }
    featureGroup.userData.export.exportChildren = false;

    this.application.notifyObjectsChanged(this.object, this, "structureChanged");
    console.info("Feature " + this.layer + " loaded.");
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

    console.info("Loading feature " + this.layer + "...");
    loader.load(url, this._onLoad, this._onProgress, this._onError);
  }

  static getDescription()
  {
    return "gis|controller." + this.name;
  }
}

Controller.addClass(WFSController);

export { WFSController };