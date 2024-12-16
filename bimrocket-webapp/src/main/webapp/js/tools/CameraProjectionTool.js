/*
 * CameraProjectionTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";

class CameraProjectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "projection_type";
    this.label = "tool.projection_type.label";
    this.help = "tool.projection_type.help";
    this.className = "projection_type";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
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
}

export { CameraProjectionTool };


