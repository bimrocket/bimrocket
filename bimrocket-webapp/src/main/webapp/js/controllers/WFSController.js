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

  static ADD_OBJECT_REPR_MODE = 0; // add gis object to representation
  static COPY_POSITION_REPR_MODE = 1; // copy gis object position to representation

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
    this.representationMode = WFSController.ADD_OBJECT_REPR_MODE;
    this.mergeGeometries = false;
    this.origin = new THREE.Vector3(420878, 4582247, 0);

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
    let featureCount = group.children.length;

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

      const features = [...group.children]; // explode group
      group.clear();

      for (let feature of features)
      {
        if (feature instanceof THREE.Group) // multi geometry
        {
          let multiGroup = new THREE.Group();
          const children = [...feature.children]; // explode group
          feature.clear();
          for (let child of children)
          {
            let featureRepr = this.createFeatureRepr(child, representation);
            multiGroup.add(featureRepr);
          }
          multiGroup.name = feature.name;
          Object.assign(multiGroup.userData, feature.userData);
          featureGroup.add(multiGroup);
        }
        else // single geometry
        {
          let featureRepr = this.createFeatureRepr(feature, representation);
          Object.assign(featureRepr.userData, feature.userData);
          featureGroup.add(featureRepr);
          feature.userData = {};
        }
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
      ObjectUtils.setSelectionEnabled(featureGroup, true);
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
    console.info("Feature " + this.layer + " loaded (" + featureCount + ").");
  }

  createFeatureRepr(feature, representation)
  {
    let featureRepr = representation.clone();
    featureRepr.name = feature.name;
    featureRepr.visible = true;

    if (featureRepr instanceof THREE.Group)
    {
      // clone builder & formulas for Groups

      featureRepr.builder =
        representation.builder ? representation.builder.clone() : null;

      Formula.copy(featureRepr, representation);
    }

    switch (this.representationMode)
    {
      case WFSController.COPY_POSITION_REPR_MODE:
        featureRepr.position.copy(feature.position);
        featureRepr.updateMatrix();
        break;

      case WFSController.ADD_OBJECT_REPR_MODE:
        featureRepr.add(feature);
        feature.visible = false;
        break;
    }
    return featureRepr;
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