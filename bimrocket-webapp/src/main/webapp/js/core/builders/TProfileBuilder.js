/*
 * TProfileBuilder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ProfileBuilder } from "./ProfileBuilder.js";
import { ProfileGeometry } from "../ProfileGeometry.js";
import * as THREE from "../../lib/three.module.js";

class TProfileBuilder extends ProfileBuilder
{
  constructor(flangeWidth = 1, height = 1,
    webThickness = 0.1, flangeThickness = 0.1)
  {
    super();
    this.flangeWidth = flangeWidth;
    this.height = height;
    this.webThickness = webThickness;
    this.flangeThickness = flangeThickness;
  }

  performBuild(profile)
  {
    const shape = new THREE.Shape();

    const xs = 0.5 * this.flangeWidth;
    const ys = 0.5 * this.height;
    const xt = 0.5 * this.webThickness;
    const yt = this.flangeThickness;

    shape.moveTo(xt, -ys);
    shape.lineTo(xt, ys - yt);
    shape.lineTo(xs, ys - yt);
    shape.lineTo(xs, ys);
    shape.lineTo(-xs, ys);
    shape.lineTo(-xs, ys - yt);
    shape.lineTo(-xt, ys - yt);
    shape.lineTo(-xt, -ys);
    shape.closePath();

    profile.updateGeometry(new ProfileGeometry(shape));

    return true;
  }
};

ObjectBuilder.registerBuilder(TProfileBuilder);

export { TProfileBuilder };
