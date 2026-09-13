/*
 * CameraProjectionTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { I18N } from "platform/i18n/I18N.js";

class CameraProjectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "projection_type";
    this.className = "projection_type";
    this.iconName = "base|perspective";

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


