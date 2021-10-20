/*
 * WFSController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { GMLLoader } from "../io/gis/GMLLoader.js";
import { GeoJSONLoader } from "../io/gis/GeoJSONLoader.js";

class WFSController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "https://your_server.com/wfs?";
    this.username = "username";
    this.password = "password";
    this.layer = "layer";
    this.format = "GeoJSON";
    this.bbox = "(0,0,100,100)";
    this.count = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetZ = 0;
    this.rotationZ = 0;
    this.extrusion = 1;
    this.diameter = 0.1;
    this.color = "#0000ff";
    this.model = "https://your_server.com/model.dae";
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
    this.application.addObject(group, this.object);
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
    url += "service=wfs&version=2.0.0&request=GetFeature&outputFormat=" +
      loader.mimeType + "&typeName=" + layer;
    const count = this.count;
    if (count > 0)
    {
      url += "&count=" + count;
    }
    const bbox = this.bbox.value;
    if (bbox && bbox.length > 0)
    {
      url += "&bbox=" + bbox;
    }
    loader.options = {
      name: layer || "wfs",
      username: this.username,
      password: this.password,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      offsetZ: this.offsetZ,
      rotationZ: this.rotationZ,
      extrusion: this.extrusion,
      diameter: this.diameter,
      color: this.color.value,
      model: this.model.value
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