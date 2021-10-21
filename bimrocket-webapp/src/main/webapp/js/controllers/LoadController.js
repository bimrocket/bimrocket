/*
 * LoadController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { IOManager } from "../io/IOManager.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Formula } from "../formula/Formula.js";

class LoadController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "https://your_server.com/model.brf";
    this.autoStart = false;

    this._url = null; // last url loaded
    this._onLoad = this.onLoad.bind(this);
    this._onProgress = this.onProgress.bind(this);
    this._onError = this.onError.bind(this);
  }

  onStart()
  {
    this.updateFormulas();
    const object = this.object;
    if (object.userData.export === undefined)
    {
      object.userData.export = {};
    }
    object.userData.export.exportChildren = false;

    let url = this.url;
    if (url.trim().length === 0) return;

    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }
    if (url !== this._url || this.object.children.length === 0)
    {
      if (url !== this._url && this.object.children.length > 0)
      {
        this.clearModel();
      }
      this.loadModel(url);
    }
  }

  onStop()
  {
  }

  onLoad(dae)
  {
    this.application.addObject(dae.scene, this.object);
  }

  onProgress()
  {
  }

  onError(error)
  {
    console.info(error);
  }

  loadModel(url)
  {
    const application = this.application;
    const intent = {
      url : url,
      options : { units : this.application.units },
      onCompleted : object =>
      {
        this._url = url;
        object.updateMatrix();
        application.initControllers(object);
        application.addObject(object, this.object);
      },
      onError: error => this.onError(error)
    };

    IOManager.load(intent);
  }

  clearModel()
  {
    const application = this.application;
    ObjectUtils.dispose(this.object);
    this.object.clear();
    application.notifyObjectsChanged(this.object, this, "structureChanged");
  }
}

Controller.addClass(LoadController);

export { LoadController };