/*
 * StopControllersTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";

class StopControllersTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "stop_controllers";
    this.label = "tool.stop_controllers.label";
    this.className = "stop_controllers";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.stopControllers();
  }
}

export { StopControllersTool };
