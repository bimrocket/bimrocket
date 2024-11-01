/*
 * CircleHollowBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { CircleBuilder } from "./CircleBuilder.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "three";

class CircleHollowBuilder extends CircleBuilder
{
  constructor(radius = 1, wallThickness = 0.1, segments = 32)
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

  copy(source)
  {
    super.copy(source);
    this.wallThickness = source.wallThickness;

    return this;
  }
};

ObjectBuilder.addClass(CircleHollowBuilder);

export { CircleHollowBuilder };

