/*
 * StartControllersTool.js
 *
 * @autor: realor
 */

BIMROCKET.StartControllersTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "start_controllers";
    this.label = "tool.start_controllers.label";
    this.className = "start_controllers";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.startControllers();
  }
};
