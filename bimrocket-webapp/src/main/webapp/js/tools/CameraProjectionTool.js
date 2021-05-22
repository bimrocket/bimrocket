/*
 * CameraProjectionTool.js
 *
 * @autor: realor
 */

BIMROCKET.CameraProjectionTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "projection_type";
    this.label = "tool.projection_type.label";
    this.help = "tool.projection_type.help";
    this.className = "projection_type";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    if (this.type === "orthographic")
    {
      application.activateCamera(application.orthographicCamera);
    }
    else
    {
      application.activateCamera(application.perspectiveCamera);      
    }
  }
};


