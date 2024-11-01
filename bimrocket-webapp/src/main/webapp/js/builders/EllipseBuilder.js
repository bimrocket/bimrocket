/*
 * EllipseBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "three";

class EllipseBuilder extends ProfileBuilder
{
  constructor(xradius = 1, yradius = 0.5, segments = 32)
  {
    super();
    this.xradius = xradius;
    this.yradius = yradius;
    this.segments = segments;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawEllipse(shape, this.xradius, this.yradius, this.segments);

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  drawEllipse(path, xradius, yradius, segments)
  {
    const incr = 2 * Math.PI / segments;

    path.moveTo(xradius, 0);
    for (let rad = incr; rad < 2 * Math.PI; rad += incr)
    {
      path.lineTo(xradius * Math.cos(rad), yradius * Math.sin(rad));
    }
    path.closePath();
  }

  copy(source)
  {
    this.xradius = source.xradius;
    this.yradius = source.yradius;
    this.segments = source.segments;

    return this;
  }
};

ObjectBuilder.addClass(EllipseBuilder);

export { EllipseBuilder };


