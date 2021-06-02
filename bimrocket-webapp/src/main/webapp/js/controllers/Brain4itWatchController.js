/*
 * Brain4itWatchController.js
 *
 * @autor: realor
 */

Brain4it.monitors = {};

BIMROCKET.Brain4itWatchController = class extends BIMROCKET.Controller
{
  static type = "Brain4itWatchController";
  static description = "Watches for expression changes.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.url = this.createProperty("string", "Server URL");
    this.module = this.createProperty("string", "Module");
    this.accessKey = this.createProperty("string", "Access key");
    this.func = this.createProperty("string", "Function to watch");
    this.output = this.createProperty("string", "Output value");

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
    if (event.type === "nodeChanged" && event.objects.includes(this.object))
    {
      this.watch();
    }
  }

  callback(name, value)
  {
    console.info("MONITOR " + name + " = " + value);
    this.output.value = value;
  }

  watch()
  {
    let url = this.url.value;
    let module = this.module.value;
    let accessKey = this.accessKey.value || "";
    let func = this.func.value;
    let moduleKey = url + "/" + module + "/" + accessKey;
    let functionKey = moduleKey + "/" + func;

    if (functionKey !== this._functionKey)
    {
      this.unwatch();

      let monitor = Brain4it.monitors[moduleKey];
      if (monitor === undefined)
      {
        monitor = new Brain4it.Monitor(url, module, accessKey);
        Brain4it.monitors[moduleKey] = monitor;
      }

      this._monitor = monitor;
      this._functionKey = functionKey;
      console.info("WATCH", this.func.value);
      monitor.watch(func, this._callback);
    }
  }

  unwatch()
  {
    if (this._monitor)
    {
      console.info("UNWATCH");
      this._monitor.unwatch(this._callback);
      this._monitor = null;
      this._functionKey = null;
    }
  }
};

BIMROCKET.controllers.push(BIMROCKET.Brain4itWatchController);