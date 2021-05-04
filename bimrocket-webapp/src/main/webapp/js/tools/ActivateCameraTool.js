/*
 * ActivateCameraTool.js
 *
 * @autor: realor
 */

BIMROCKET.ActivateCameraTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "activate_camera";
    this.label = "tool.activate_camera.label";
    this.help = "tool.activate_camera.help";
    this.className = "activate_camera";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    var application = this.application;
    var object = application.selection.object;
    if (object instanceof THREE.Camera)
    {
      application.activateCamera(object);
    }
  }
};
