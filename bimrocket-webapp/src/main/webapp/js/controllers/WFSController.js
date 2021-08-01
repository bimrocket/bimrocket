/*
 * WFSController.js
 *
 * @author: realor
 */

import { Controller } from "./Controller.js";
import { ControllerManager } from "./ControllerManager.js";
import { GMLLoader } from "../io/gis/GMLLoader.js";
import { GeoJSONLoader } from "../io/gis/GeoJSONLoader.js";

class WFSController extends Controller
{
  static type = "WFSController";
  static description = "Loads geometry from a Web Feature Service.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.url = this.createProperty("string", "WFS service url");
    this.username = this.createProperty("string", "Username");
    this.password = this.createProperty("string", "Password");
    this.layer = this.createProperty("string", "Layer");
    this.format = this.createProperty("string", "Format (GML,GeoJSON)");
    this.bbox = this.createProperty("string", "Bounding box(x1,y1,x2,y2)");
    this.count = this.createProperty("number", "Feature count");
    this.offsetX = this.createProperty("number", "Offset x");
    this.offsetY = this.createProperty("number", "Offset y");
    this.offsetZ = this.createProperty("number", "Offset z");
    this.rotationZ = this.createProperty("number", "Rotation in z-axis");
    this.extrusion = this.createProperty("string", "Polygon extrusion");
    this.diameter = this.createProperty("string", "LineString diameter");
    this.color = this.createProperty("string", "Diffuse Color (0xrrggbb)");
    this.model = this.createProperty("string", "Model URL");

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
    var url = this.url.value;
    var layer = this.layer.value;
    var format = this.format.value || "GeoJSON";
    var loader;
    if (format === "GML")
    {
      loader = new GMLLoader();
    }
    else
    {
      loader = new GeoJSONLoader();
    }
    url += "&service=wfs&version=2.0.0&request=GetFeature&outputFormat=" +
      loader.mimeType + "&typeName=" + layer;
    var count = this.count.value;
    if (count)
    {
      url += "&count=" + this.value;
    }
    var bbox = this.bbox.value;
    if (bbox)
    {
      url += "&bbox=" + bbox;
    }
    loader.options = {
      name: layer || "wfs",
      username: this.username.value,
      password: this.password.value,
      offsetX: this.offsetX.value,
      offsetY: this.offsetY.value,
      offsetZ: this.offsetZ.value,
      rotationZ: this.rotationZ.value,
      extrusion: this.extrusion.value,
      diameter: this.diameter.value,
      color: this.color.value,
      model: this.model.value
    };

    loader.load(url, this._onLoad, this._onProgress, this._onError);
  }
}

ControllerManager.addClass(WFSController);

export { WFSController };