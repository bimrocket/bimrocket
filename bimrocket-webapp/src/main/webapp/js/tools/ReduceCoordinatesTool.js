/*
 * ReduceCoordinatesTool.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Tool } from "../tools/Tool.js";

class ReduceCoordinatesTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "reduce_coordinates";
    this.label = "tool.reduce_coordinates.label";
    this.className = "reduce_coordinates";
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
