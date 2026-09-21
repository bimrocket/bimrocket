/*
 * StopControllersTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class StopControllersTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "stop_controllers";
    this.label = "control|tool.stop_controllers.label";
    this.className = "stop-controllers";
    this.iconName = "stop";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.stopControllers();
  }
}

export { StopControllersTool };
