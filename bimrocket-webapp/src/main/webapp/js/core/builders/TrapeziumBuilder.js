/*
 * TrapeziumBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../ProfileGeometry.js";
import * as THREE from "../../lib/three.module.js";

class TrapeziumBuilder extends ProfileBuilder
{
  constructor(bottomXDim = 1, height = 1, topXDim = 0.5, topXOffset = 0.2)
  {
    super();
    this.bottomXDim = bottomXDim;
    this.height = height;
    this.topXDim = topXDim;
    this.topXOffset = topXOffset;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    const xb = 0.5 * this.bottomXDim;
    const yd = 0.5 * this.height;
    const xd = this.topXDim;
    const xo = this.topXOffset;

    shape.moveTo(xb, -yd);
    shape.lineTo(-xb, -yd);
    shape.lineTo(-xb + xo, yd);
    shape.lineTo(-xb + xo + xd, yd);
    shape.closePath();

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }
};

ObjectBuilder.registerBuilder(TrapeziumBuilder);

export { TrapeziumBuilder };
