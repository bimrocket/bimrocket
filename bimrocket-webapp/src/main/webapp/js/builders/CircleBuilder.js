/*
 * CircleBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "../lib/three.module.js";

class CircleBuilder extends ProfileBuilder
{
  constructor(radius = 1, segments = 32)
  {
    super();
    this.radius = radius;
    this.segments = segments; // segments per turn (360 degrees)
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawCircle(shape, this.radius, this.segments);

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  drawCircle(path, radius = 1, segments = 32)
  {
    const incr = 2 * Math.PI / segments;

    path.moveTo(radius, 0);
    for (let i = 0; i < segments; i++)
    {
      let rad = incr * i;
      path.lineTo(radius * Math.cos(rad), radius * Math.sin(rad));
    }
    path.closePath();
  }

  copy(source)
  {
    this.radius = source.radius;
    this.segments = source.segments;

    return this;
  }
};

ObjectBuilder.addClass(CircleBuilder);

export { CircleBuilder };

