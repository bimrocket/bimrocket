/*
 * ZoomAllTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";

class ZoomAllTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "zoom_all";
    this.label = "base|tool.zoom_all.label";
    this.className = "zoom-all";
    this.iconName = "base|zoom-all";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const container = application.container;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = application.camera;

    application.scene.updateMatrixWorld(true);
    ObjectUtils.zoomAll(camera, application.baseObject, aspect);

    application.notifyObjectsChanged(camera, this);
  }
}

export { ZoomAllTool };


