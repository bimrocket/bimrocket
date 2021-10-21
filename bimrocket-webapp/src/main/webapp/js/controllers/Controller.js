/*
 * Controller.js
 *
 * @author realor
 */

import { Formula } from "../formula/Formula.js";

class Controller
{
  static classes = {};

  constructor(object, name)
  {
    this.application = null;
    this.object = object;
    this.name = name || "controller";
    this._started = false;
    this.autoStart = true;
  }

  init(application)
  {
    this.application = application;
    if (this.autoStart) this.start();
  }

  start()
  {
    if (!this._started)
    {
      this.onStart();
      this._started = true;
    }
  }

  stop()
  {
    if (this._started)
    {
      this.onStop();
      this._started = false;
    }
  }

  isStarted()
  {
    return this._started;
  }

  onStart()
  {
  }

  onStop()
  {
  }

  hasChanged(event)
  {
    return this.updateFormulas()
      || (event.source !== this && event.objects.includes(this.object));
  }

  updateFormulas()
  {
    return Formula.update(this.object, "controllers." + this.name, true);
  }

  /* static methods */

  static addClass(controllerClass)
  {
    this.classes[controllerClass.name] = controllerClass;
  }

  /* returns an array with the names of the controllers of the given class */
  static getTypesOf(controllerClass)
  {
    let types = [];
    for (let className in this.classes)
    {
      let cls = this.classes[className];
      if (cls.prototype instanceof controllerClass || cls === controllerClass)
      {
        types.push(className);
      }
    }
    return types;
  }

  static getDescription()
  {
    return "controller." + this.name;
  }
}

export { Controller };