/*
 * Brain4itPostController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { Brain4it } from "../lib/Brain4it.js"

class Brain4itPostController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "";
    this.module = "your_module";
    this.accessKey = "access_key";
    this.func = "@function_to_call";
    this.input = 0;
    this.autoStart = false;

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._value = null;
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
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      let value = this.input;
      if (value !== this._value)
      {
        this.postData(value);
      }
    }
  }

  postData(value)
  {
    this._value = value;

    let url = this.url;
    if (url.trim().length === 0) return;

    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }
    let module = this.module;
    let func = this.func;
    console.info("POST " + url + " -> " + value);

    let client = new Brain4it.Client(url, module + "/" + func);
    client.send(value);
  }
}

Controller.addClass(Brain4itPostController);

export { Brain4itPostController };