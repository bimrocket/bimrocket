/*
 * BooleanOperationTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../solid/Solid.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class BooleanOperationTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "boolean_operation";
    this.label = "tool.boolean_operation.label";
    this.help = "tool.boolean_operation.help";
    this.className = "boolean_operation";
    this.operation = "subtract";
    this.keepOperands = false;
    this.keepParent = true;
    this.immediate = true;
    this.setOptions(options);

    this.material = new THREE.MeshPhongMaterial(
      {color : 0x4040ff, side : THREE.DoubleSide});
  }

  execute()
  {
    const application = this.application;
    var objects = application.selection.roots;
    var operands = [];
    for (var i = 0; i < objects.length; i++)
    {
      var object = objects[i];
      if (object instanceof THREE.Mesh)
      {
        var solid = new Solid(object.geometry.clone());
        object.matrixWorld.decompose(
          solid.position, solid.rotation, solid.scale);
        solid.updateMatrix();
        solid.updateMatrixWorld();
        operands.push(solid);
      }
      else if (object instanceof Solid)
      {
        operands.push(object);
      }
    }
    if (operands.length > 1)
    {
      let solid = operands.shift();

      let result = solid.booleanOperation(this.operation,
        operands, this.keepOperands);
      result.updateMatrix();

      if (this.keepOperands)
      {
        if (this.keepParent)
        {
          application.addObject(result, solid.parent, true);
        }
        else
        {
          application.addObject(result, application.baseObject, true);
        }
        application.updateVisibility(solid, false);
        application.updateVisibility(operands, false);
      }
      else
      {
        // remove operands
        for (let i = 0; i < operands.length; i++)
        {
          application.removeObject(operands[i]);
        }
      }
      application.selection.set(result);
    }
  }
}

export { BooleanOperationTool };
