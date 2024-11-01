/*
 * CircularSectorBuilder.js
 *
 * @author realor
 */

import { CircleBuilder } from "./CircleBuilder.js";
import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "three";

class CircularSectorBuilder extends CircleBuilder
{
  constructor(radius = 1, angle = 180, segments = 32)
  {
    super(radius, segments);
    this.angle = angle;
  }

  performBuild(profile)
  {
    if (this.angle < 0)
      throw "Unsupported negative angle";

    const shape = new THREE.Shape();

    if (this.angle >= 360)
    {
      this.drawCircle(shape, this.radius, this.segments);
    }
    else
    {
      this.drawSector(shape, this.radius, this.angle, this.segments);
    }

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  drawSector(path, radius = 1, angle = 180, segments = 32)
  {
    const steps = Math.ceil(segments * angle / 360);
    const angleRad = THREE.MathUtils.degToRad(angle);
    const incr = angleRad / steps;

    path.moveTo(0, 0);
    for (let i = 0; i <= steps; i++)
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
    this.angle = source.angle;

    return this;
  }
};

ObjectBuilder.addClass(CircularSectorBuilder);

export { CircularSectorBuilder };

