/*
 * CircleBuilder.js
 *
 * @author realor
 */

import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../ProfileGeometry.js";
import * as THREE from "../../lib/three.module.js";

class CircleBuilder extends ProfileBuilder
{
  constructor(radius = 1, segments = 16)
  {
    super();
    this.radius = radius;
    this.segments = segments;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawCircle(shape, this.radius, this.segments);

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  drawCircle(path, radius = 1, segments = 16)
  {
    const incr = 2 * Math.PI / segments;

    path.moveTo(radius, 0);
    for (let rad = incr; rad < 2 * Math.PI; rad += incr)
    {
      path.lineTo(radius * Math.cos(rad), radius * Math.sin(rad));
    }
    path.closePath();
  }
};

export { CircleBuilder };

