/*
 * StartControllersTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class StartControllersTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "start_controllers";
    this.label = "tool.start_controllers.label";
    this.className = "start_controllers";
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
