/*
 * ActivateCameraTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class ActivateCameraTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "activate_camera";
    this.label = "base|tool.activate_camera.label";
    this.className = "activate-camera";
    this.iconName = "base|activate-camera";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object instanceof THREE.Camera)
    {
      application.activateCamera(object);
    }
  }
}

export { ActivateCameraTool };
