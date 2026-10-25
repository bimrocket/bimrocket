/*
 * CameraProjectionTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";

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
    const camera = application.camera;
    const persp = application.perspectiveCamera;
    const ortho = application.orthographicCamera;
    const baseObject = application.baseObject;

    if (this.type === "orthographic")
    {
      if (camera === persp)
      {
        const distance = ObjectUtils.distanceByBounds(persp, baseObject);
        ObjectUtils.copyPerspectiveToOrthographic(persp, ortho, distance);
        application.notifyObjectsChanged(ortho);
      }
      application.activateCamera(ortho);
    }
    else // perspertive
    {
      if (camera === ortho)
      {
        const distance = ObjectUtils.distanceByBounds(ortho, baseObject);
        ObjectUtils.copyOrthographicToPerspective(ortho, persp, distance);
        application.notifyObjectsChanged(persp);
      }
      application.activateCamera(persp);
    }
  }
}

export { CameraProjectionTool };


