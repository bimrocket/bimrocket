/*
 * StartControllersTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class StartControllersTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "start_controllers";
    this.label = "control|tool.start_controllers.label";
    this.className = "control|start-controllers";
    this.iconName = "control|start-controllers";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.startControllers();
  }
}

export { StartControllersTool };
