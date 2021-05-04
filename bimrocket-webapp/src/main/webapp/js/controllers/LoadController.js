/*
 * LoadController.js
 *
 * @autor: realor
 */

BIMROCKET.LoadController = class extends BIMROCKET.Controller
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
    var url = this.url.value;
    var loader = new BIMROCKET.Collada.Loader(); 

    console.info("Loading model from " + url);
    loader.load(url, this._onLoad, this._onProgress, this._onError);
  }
};

BIMROCKET.controllers.push(BIMROCKET.LoadController);