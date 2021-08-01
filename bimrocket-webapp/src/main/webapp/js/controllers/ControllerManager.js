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
}

export { ControllerManager };


