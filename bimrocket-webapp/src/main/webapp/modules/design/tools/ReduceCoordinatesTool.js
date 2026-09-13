/*
 * ReduceCoordinatesTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";

class ReduceCoordinatesTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "reduce_coordinates";
    this.label = "design|tool.reduce_coordinates.label";
    this.className = "reduce-coordinates";
    this.iconName = "design|reduce-coordinates";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const container = application.container;
    const baseObject = application.baseObject;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = application.camera;

    ObjectUtils.reduceCoordinates(baseObject);
    ObjectUtils.zoomAll(camera, baseObject, aspect);

    application.notifyObjectsChanged(baseObject, this, "structureChanged");
  }
}

export { ReduceCoordinatesTool };
