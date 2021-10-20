/*
 * ExtrudeSolidTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { Extruder } from "../builders/Extruder.js";
import * as THREE from "../lib/three.module.js";

class ExtrudeTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "extrude";
    this.label = "tool.extrude.label";
    this.help = "tool.extrude.help";
    this.className = "extrude";
    this.setOptions(options);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object instanceof Profile)
    {
      const profile = object;
      profile.geometry.computeBoundingSphere();
      const depth = profile.geometry.boundingSphere.radius;
      const parent = profile.parent;
      application.removeObject(profile);
      const solid = new Solid();
      solid.name = "Extrude";
      solid.builder = new Extruder(depth);
      profile.visible = false;
      solid.add(profile);
      ObjectBuilder.build(solid);
      application.addObject(solid, parent, false);
      application.selection.set(solid);
    }
  }
}

export { ExtrudeTool };
