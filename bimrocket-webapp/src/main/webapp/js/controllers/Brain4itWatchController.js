/*
 * Brain4itWatchController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";
import { Brain4it } from "../lib/Brain4it.js"

Brain4it.monitors = {};

class Brain4itWatchController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.url = "";
    this.module = "your_module";
    this.accessKey = "access_key";
    this.func = "@function_to_call";
    this.output = null;

    this._monitor = null;
    this._functionKey = null;
    this._callback = this.callback.bind(this);
    this._onNodeChanged = this.onNodeChanged.bind(this);
  }

  onStart()
  {
    this.application.addEventListener("scene", this._onNodeChanged);
    this.watch();
  }

  onStop()
  {
    this.application.removeEventListener("scene", this._onNodeChanged);
    this.unwatch();
  };

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      this.watch();
    }
  }

  callback(name, value)
  {
    console.info("MONITOR " + name + " = " + value);
    this.output = value;
    this.application.notifyObjectsChanged(this.object, this);
  }

  watch()
  {
    let url = this.url;
    if (url.trim().length === 0) return;

    if (url[0] === '/')
    {
      url = document.location.protocol + "//" + document.location.host + url;
    }
    let module = this.module;
    let accessKey = this.accessKey || "";
    let func = this.func;
    let moduleKey = url + "/" + module + "/" + accessKey;
    let functionKey = moduleKey + "/" + func;

    if (functionKey !== this._functionKey)
    {
      this.unwatch();

      let monitor = Brain4it.monitors[moduleKey];
      if (monitor === undefined)
      {
        monitor = new Brain4it.Monitor(url, module, accessKey);
        monitor.connectionDelay = 1000;
        Brain4it.monitors[moduleKey] = monitor;
      }

      this._monitor = monitor;
      this._functionKey = functionKey;
      this._func = func;
      console.info("WATCH", func);
      monitor.watch(this._func, this._callback);
    }
  }

  unwatch()
  {
    if (this._monitor)
    {
      console.info("UNWATCH");
      this._monitor.unwatch(this._func, this._callback);
      this._monitor = null;
      this._functionKey = null;
      this._func = null;
    }
  }
}

Controller.addClass(Brain4itWatchController);

export { Brain4itWatchController };