/*
 * ActivateCameraTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class ActivateCameraTool extends Tool
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
    const application = this.application;
    const object = application.selection.object;
    if (object instanceof THREE.Camera)
    {
      application.activateCamera(object);
    }
  }
}

export { ActivateCameraTool };
