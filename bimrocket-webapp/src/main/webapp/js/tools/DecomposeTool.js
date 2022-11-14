/*
 * DecomposeTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { SolidBuilder } from "../builders/SolidBuilder.js";

class DecomposeTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "decompose";
    this.label = "tool.decompose.label";
    this.help = "tool.decompose.help";
    this.className = "decompose";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.roots;
    let selectedObjects = [];

    for (let object of objects)
    {
      let parent = object.parent;

      if (parent === application.scene) continue;

      let children;
      if (object instanceof Solid)
      {
        if (object.children.length === 2)
        {
          selectedObjects.push(object);
          continue;
        }
        children = object.children.slice(2);
      }
      else
      {
        if (object.children.length === 0)
        {
          selectedObjects.push(object);
          continue;
        }
        children = object.children.slice(0);
      }

      for (let child of children)
      {
        child.visible = true;
        if (child instanceof Solid)
        {
          child.facesVisible = true;
          child.edgesVisible = true;
        }
        application.removeObject(child);
        child.matrix.premultiply(object.matrixWorld);
        child.matrix.decompose(child.position, child.rotation, child.scale);
        application.addObject(child, parent, true);
      }
      application.removeObject(object);
      selectedObjects.push(...children);
    }
    if (selectedObjects.length > 0)
    {
      application.selection.set(...selectedObjects);
    }
  }
}

export { DecomposeTool };
