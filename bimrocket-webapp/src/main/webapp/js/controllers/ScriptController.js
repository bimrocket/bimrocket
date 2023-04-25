/*
 * ScriptController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";

class ScriptController extends Controller
{
  constructor(object, name)
  {
    super(object, name);
    this.scriptUrl = "script_url";
  }

  onStart()
  {
    this.loadScript();
  }

  onStop()
  {
  }

  async loadScript()
  {
    if (this.scriptUrl === "script_url") return;

    try
    {
      const response = await fetch(this.scriptUrl);
      const code = await response.text();
      const fn = new Function("controller", code);
      fn(this);
    }
    catch (ex)
    {
      console.error(`Error loading script ${this.scriptUrl}: ${ex}`);
    }
  }
}

Controller.addClass(ScriptController);

export { ScriptController };