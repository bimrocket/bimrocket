/*
 * Brain4itPostController.js
 *
 * @autor: realor
 */

BIMROCKET.Brain4itPostController = class extends BIMROCKET.Controller
{
  static type = "Brain4itPostController";
  static description = "Posts a value to Brain4it.";
  
  constructor(application, object, name)
  {
    super(application, object, name);

    this.url = this.createProperty("string", "Server URL");
    this.module = this.createProperty("string", "Module");
    this.accessKey = this.createProperty("string", "Access key");
    this.func = this.createProperty("string", "Function to call");
    this.input = this.createProperty("number", "Input value");

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this.value = null;    
  }

  onStart()
  {
    this.application.addEventListener('scene', this._onNodeChanged, false);
  }

  onStop()
  {
    this.application.removeEventListener('scene', this._onNodeChanged, false);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.input.isBoundTo(event.object))
    {
      let value = this.input.value;
      if (value !== this.value)
      {
        this.postData(value);
      }
    }
  }

  postData(value)
  {
    this.value = value;

    let url = this.url.value;
    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }
    let module = this.module.value;
    let func = this.func.value;
    console.info("POST " + url + " -> " + value);

    let client = new Brain4it.Client(url, module + "/" + func);
    client.send(value);
  }
};

BIMROCKET.controllers.push(BIMROCKET.Brain4itPostController);