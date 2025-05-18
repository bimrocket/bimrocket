/*
 * Brain4itPostController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { Brain4it } from "../lib/Brain4it.js"
import { Brain4itWatchController } from "./Brain4itWatchController.js"

class Brain4itPostController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "";
    this.module = "your_module";
    this.accessKey = "access_key";
    this.func = "@function_to_call";
    this.input = "";
    this.watchController = ""; // Brain4itWatchController name
    this.autoSend = true;

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._data = null; // last Brain4it data sent
    this._invoker = null;

    this._callback = this.callback.bind(this);
  }

  onStart()
  {
    this.application.addEventListener('scene', this._onNodeChanged, false);
    this._invoker = new Brain4it.Invoker(this.getClient(), this.module);
    this._invoker.logging = true;
  }

  onStop()
  {
    this.application.removeEventListener('scene', this._onNodeChanged, false);
    this._invoker = null;
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      if (this.autoSend)
      {
        let data = this.getDataToSend();

        if (this._data === null)
        {
          // first time
          this._data = data;
        }
        else if (!this.equalsData(data, this._data))
        {
          this.postData(data);
        }
      }
    }
  }

  execute()
  {
    let data = this.getDataToSend();
    this.postData(data);
  }

  getClient()
  {
    let url = this.url;
    if (url.trim().length === 0) return;

    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }
    return new Brain4it.Client(url, "");
  }

  callback(status, responseText, serverTime)
  {
    if (this.watchController && typeof this.object.controllers === "object")
    {
      let controller = this.object.controllers[this.watchController];
      if (controller instanceof Brain4itWatchController)
      {
        controller.serverTime = serverTime;
      }
    }
  }

  postData(data)
  {
    this._data = data;
    this._invoker.invoke(this.func, data, true, this._callback);
  }

  getDataToSend()
  {
    let data = this.input;
    if (data instanceof Array)
    {
      let list = new Brain4it.List();
      for (let item of data)
      {
        let type = typeof item;
        if (type === "string" ||
            type === "number" ||
            type === "boolean" ||
            item === null)
        {
          list.add(item);
        }
      }
      data = list;
    }
    return data;
  }

  equalsData(data1, data2)
  {
    if (data1 === data2) return true;
    if (data1 instanceof Array && data2 instanceof Array)
    {
      if (data1.length !== data2.length) return false;
      for (let i = 0; i < data1.length; i++)
      {
        if (data1[i] !== data2[i]) return false;
      }
      return true;
    }
    return false;
  }
}

Controller.addClass(Brain4itPostController);

export { Brain4itPostController };