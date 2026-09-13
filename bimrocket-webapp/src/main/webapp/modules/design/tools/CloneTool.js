/*
 * CloneTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Cloner } from "platform/builders/Cloner.js";
import { ObjectBuilder } from "platform/builders/ObjectBuilder.js";
import * as THREE from "three";

class CloneTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "clone";
    this.label = "design|tool.clone.label";
    this.help = "design|tool.clone.help";
    this.className = "clone";
    this.iconName = "design|clone";

    this.dynamic = false;
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.roots;
    for (let object of objects)
    {
      if (object !== application.baseObject)
      {
        let clone;
        if (this.dynamic)
        {
          clone = new THREE.Object3D();
          clone.name = object.name + "_cloner";
          clone.builder = new Cloner(object);
          ObjectUtils.setSelectionGroup(clone, true)
          ObjectBuilder.build(clone);
        }
        else
        {
          clone = object.clone(true);
          clone.name = object.name + "_clone";
        }
        application.addObject(clone, object.parent);
      }
    }
  }
}

export { CloneTool };
