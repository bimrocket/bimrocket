/*
 * LoadController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { IOManager } from "../io/IOManager.js";

class LoadController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "https://your_server.com/model.dae";
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetZ = 0;
    this.rotationZ = 0;
    this.autoStart = false;

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

  onError(error)
  {
    console.info(error);
  }

  loadModel()
  {
    let url = this.url;
    if (url.trim().length === 0) return;

    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }

    const application = this.application;
    const intent = {
      url : url,
      options : { units : this.application.units },
      onCompleted : object =>
      {
        object.updateMatrix();
        application.initControllers(object);
        application.addObject(object, this.object);
      },
      onError: error => this.onError(error)
    };

    IOManager.load(intent);
  }
}

Controller.addClass(LoadController);

export { LoadController };