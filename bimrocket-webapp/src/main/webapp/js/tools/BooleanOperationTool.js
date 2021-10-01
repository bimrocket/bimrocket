/*
 * BooleanOperationTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { ObjectBuilder } from "../core/ObjectBuilder.js";
import { BooleanOperator } from "../core/builders/BooleanOperator.js";
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
    this.operation = BooleanOperator.SUBTRACT;
    this.keepParent = true;
    this.immediate = true;
    this.setOptions(options);

    this.material = new THREE.MeshPhongMaterial(
      {color : 0x4040ff, side : THREE.DoubleSide});
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.roots;
    let operands = [];
    for (let object of objects)
    {
      if (object instanceof THREE.Mesh)
      {
        let solid = new Solid(object.geometry.clone());
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
      const parent = operands[0].parent;
      let result = new Solid();
      result.name = this.operation;
      for (let operand of operands)
      {
        let removeEvent = {type : "removed", object : operand,
          parent : operand.parent, source : this};

        result.attach(operand);
        application.notifyEventListeners("scene", removeEvent);
      }

      result.builder = new BooleanOperator(this.operation);
      ObjectBuilder.build(result);

      if (this.keepParent)
      {
        application.addObject(result, parent, true);
      }
      else
      {
        application.addObject(result, application.baseObject, true);
      }

      application.selection.set(result);
    }
  }
}

export { BooleanOperationTool };
