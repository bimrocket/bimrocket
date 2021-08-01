/*
 * ResetMatrixTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";

class ResetMatrixTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "reset_matrix";
    this.label = "tool.reset_matrix.label";
    this.className = "reset_matrix";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let object = application.selection.object;
    if (object.geometry)
    {
      object.geometry.applyMatrix4(object.matrix);
      object.matrix.identity();
      object.matrix.decompose(
        object.position, object.quaternion, object.scale);
      object.updateMatrixWorld();
      object.updateGeometry(object.geometry);
      
      application.notifyObjectUpdated(object);
      application.updateSelection();
    }
  }
}

export { ResetMatrixTool };