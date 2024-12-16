/*
 * ResetMatrixTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";

class ResetMatrixTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "reset_matrix";
    this.label = "tool.reset_matrix.label";
    this.className = "reset_matrix";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    let object = application.selection.object;
    if (object.geometry)
    {
      object.geometry.applyMatrix4(object.matrix);
      if (object instanceof Solid)
      {
        object.updateGeometry(object.geometry);
      }

      object.matrix.identity();
      object.matrix.decompose(
        object.position, object.quaternion, object.scale);
      object.updateMatrixWorld();

      application.notifyObjectsChanged(object, this);
      application.updateSelection();
    }
  }
}

export { ResetMatrixTool };