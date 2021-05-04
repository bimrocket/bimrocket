/*
 * StartControllersTool.js
 *
 * @autor: realor
 */

BIMROCKET.StopControllersTool = class extends BIMROCKET.Tool
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
};
