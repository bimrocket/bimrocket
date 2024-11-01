/*
 * RectangleBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "three";

class RectangleBuilder extends ProfileBuilder
{
  constructor(width = 1, height = 1)
  {
    super();
    this.width = width;
    this.height = height;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawRectangle(shape, this.width, this.height);

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }

  drawRectangle(path, width, height)
  {
    const xdim = 0.5 * width;
    const ydim = 0.5 * height;

    path.moveTo(-xdim, -ydim);
    path.lineTo(xdim, -ydim);
    path.lineTo(xdim, ydim);
    path.lineTo(-xdim, ydim);
    path.closePath();
  }

  copy(source)
  {
    this.width = source.width;
    this.height = source.height;

    return this;
  }
};

ObjectBuilder.addClass(RectangleBuilder);

export { RectangleBuilder };

