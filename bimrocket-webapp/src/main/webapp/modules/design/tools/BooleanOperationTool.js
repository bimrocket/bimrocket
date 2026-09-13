/*
 * BooleanOperationTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Solid } from "platform/core/Solid.js";
import { ObjectBuilder } from "platform/builders/ObjectBuilder.js";
import { BooleanOperator } from "platform/builders/BooleanOperator.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class BooleanOperationTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "boolean_operation";
    this.label = "design|tool.boolean_operation.label";
    this.help = "design|tool.boolean_operation.help";
    this.className = "boolean-operation";
    this.iconName = "design|boolean-operation";

    this.operation = BooleanOperator.SUBTRACT;
    this.keepParent = true;
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.material = new THREE.MeshPhongMaterial(
      {color : 0x4040ff, side : THREE.DoubleSide});
  }

  execute()
  {
    const application = this.application;
    let operands = application.selection.roots;
    if (operands.length > 1)
    {
      const parent = operands[0].parent;

      let result = new Solid();
      result.name = this.operation;
      for (let operand of operands)
      {
        let removeEvent = { type : "removed", object : operand,
          parent : operand.parent, source : this };

        result.attach(operand);
        application.notifyEventListeners("scene", removeEvent);
      }

      result.builder = new BooleanOperator(this.operation);
      ObjectBuilder.build(result);

      if (this.keepParent)
      {
        application.addObject(result, parent, true, true);
      }
      else
      {
        application.addObject(result, application.baseObject, true, true);
      }

      application.selection.set(result);
    }
  }
}

export { BooleanOperationTool };
