/*
 * LoadController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { ControllerManager } from "./ControllerManager.js";
import { ColladaLoader } from "../io/ColladaLoader.js";

class LoadController extends Controller
{
  static type = "LoadController";
  static description = "Loads a model into scene.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.url = this.createProperty("string", "Model url");
    this.offsetX = this.createProperty("number", "Offset x expression");
    this.offsetY = this.createProperty("number", "Offset y expression");
    this.offsetZ = this.createProperty("number", "Offset z expression");
    this.rotationZ = this.createProperty("number", "Rotation in z-axis expression");

    this._onLoad = this.onLoad.bind(this);
    this._onProgress = this.onProgress.bind(this);
    this._onError = this.onError.bind(this);
  }

  onStart()
  {
    this.loadModel();
  }

  onStop()
  {
  }

  onLoad(dae)
  {
    console.info(dae.scene);
    this.application.addObject(dae.scene, this.object);
  }

  onProgress()
  {
  }

  onError()
  {
  }

  loadModel()
  {
    const url = this.url.value;
    if (url)
    {
      const loader = new ColladaLoader();

      console.info("Loading model from " + url);
      loader.load(url, this._onLoad, this._onProgress, this._onError);
    }
  }
}

ControllerManager.addClass(LoadController);

export { LoadController };