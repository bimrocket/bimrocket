/*
 * LProfileBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../ProfileGeometry.js";
import * as THREE from "../../lib/three.module.js";

class LProfileBuilder extends ProfileBuilder
{
  constructor(width = 1, height = 1, thickness = 0.1)
  {
    super();
    this.width = width;
    this.height = height;
    this.thickness = thickness;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    const xs = 0.5 * this.width;
    const ys = 0.5 * this.height;
    const t = this.thickness;

    shape.moveTo(-xs + t, -ys + t);
    shape.lineTo(-xs + t, ys);
    shape.lineTo(-xs, ys);
    shape.lineTo(-xs, -ys);
    shape.lineTo(xs, -ys);
    shape.lineTo(xs, -ys + t);
    shape.closePath();

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  copy(source)
  {
    this.width = source.width;
    this.height = source.height;
    this.thickness = source.thickness;

    return this;
  }
};

ObjectBuilder.registerBuilder(LProfileBuilder);

export { LProfileBuilder };
