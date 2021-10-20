/*
 * RectangleHollowBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { RectangleBuilder } from "./RectangleBuilder.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import * as THREE from "../lib/three.module.js";

class RectangleHollowBuilder extends RectangleBuilder
{
  constructor(width = 1, height = 1, wallThickness = 0.1)
  {
    super();
    this.width = width;
    this.height = height;
    this.wallThickness = wallThickness;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    this.drawRectangle(shape, this.width, this.height);

    const hole = new THREE.Path();
    const thickness = 2 * this.wallThickness;

    this.drawRectangle(hole, this.width - thickness, this.height - thickness);
    shape.holes.push(hole);

    profile.updateGeometry(new ProfileGeometry(shape));
  }

  copy(source)
  {
    super.copy(source);
    this.wallThickness = source.wallThickness;

    return this;
  }
};

ObjectBuilder.addClass(RectangleHollowBuilder);

export { RectangleHollowBuilder };