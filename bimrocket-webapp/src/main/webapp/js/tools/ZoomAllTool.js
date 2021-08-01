/*
 * ZoomAllTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";

class ZoomAllTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "zoom_all";
    this.label = "tool.zoom_all.label";
    this.help = "tool.zoom_all.help";
    this.className = "zoom_all";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    const container = application.container;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = application.camera;

    application.scene.updateMatrixWorld(true);
    ObjectUtils.zoomAll(camera, application.baseObject, aspect);

    const changeEvent = {type: "nodeChanged", objects: [camera], source : this};
    application.notifyEventListeners("scene", changeEvent);
  }
}

export { ZoomAllTool };


