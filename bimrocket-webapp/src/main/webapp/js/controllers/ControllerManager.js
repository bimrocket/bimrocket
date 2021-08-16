/**
 * ControllerManager.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";

class ControllerManager
{
  static classes = {};

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
}

export { ControllerManager };


