/*
 * Controller.js
 *
 * @author realor
 */

import { Expression } from "../utils/Expression.js";

class Controller
{
  static type = "Controller";
  static description = "Abstract controller.";

  constructor(application, object, name)
  {
    this.application = application;
    this.object = object;
    this.name = name || "controller";
    this._started = false;
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

  createPanel()
  {
    return null;
  }

  onStart()
  {
  }

  onStop()
  {
  }

  createProperty(type, label, value, definition)
  {
    return new Expression(this.application, this.object,
      type, label, value, definition);
  }
}

export { Controller };