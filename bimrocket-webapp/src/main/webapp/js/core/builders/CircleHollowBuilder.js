/*
 * CircleHollowBuilder.js
 *
 * @author realor
 */

import { CircleBuilder } from "./CircleBuilder.js";
import { ProfileGeometry } from "../ProfileGeometry.js";
import * as THREE from "../../lib/three.module.js";

class CircleHollowBuilder extends CircleBuilder
{
  constructor(radius = 1, wallThickness = 0.1, segments = 16)
  {
    super();
    this.radius = radius;
    this.wallThickness = wallThickness;
    this.segments = segments;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawCircle(shape, this.radius, this.segments);

    const hole = new THREE.Path();
    this.drawCircle(hole, this.radius - this.wallThickness, this.segments);
    shape.holes.push(hole);

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }
};

export { CircleHollowBuilder };

