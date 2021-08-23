/*
 * MakeSolidTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../solid/Solid.js";
import * as THREE from "../lib/three.module.js";

class MakeSolidTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "make_solid";
    this.label = "tool.make_solid.label";
    this.help = "tool.make_solid.help";
    this.className = "make_solid";
    this.setOptions(options);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object instanceof THREE.Mesh)
    {
      let solid = new Solid(object.geometry);
      object.matrix.decompose(solid.position, solid.rotation, solid.scale);
      solid.updateMatrix();
      let parent = object.parent;
      application.removeObject(object);
      application.addObject(solid, parent, false);
      application.selection.set(solid);
    }
    else if (object instanceof Solid)
    {
      application.selection.clear();
      object.updateGeometry(object.geometry);
      application.selection.set(object);
    }
  }
}

export { MakeSolidTool };

