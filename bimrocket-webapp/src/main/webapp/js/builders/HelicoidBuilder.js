/*
 * HelicoidBuilder.js
 *
 *  @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { CordBuilder } from "./CordBuilder.js";
import { Cord } from "../core/Cord.js";
import { CordGeometry } from "../core/CordGeometry.js";
import * as THREE from "../lib/three.module.js";

class HelicoidBuilder extends CordBuilder
{
  constructor(radius = 1, laps = 4, advance = 1, segments = 32)
  {
    super();
    this.radius = radius;
    this.laps = laps;
    this.advance = advance;
    this.segments = segments;
  }

  performBuild(cord)
  {
    if (cord instanceof Cord)
    {
      const cordPoints = [];
      const radius = this.radius;
      const segments = this.segments;
      const steps = Math.round(this.laps * segments);
      const angleByStep = 2 * Math.PI / segments;
      const heightByStep = this.advance / segments;
      let angle = 0;
      let z = 0;

      for (let i = 0; i <= steps; i++)
      {
        let x = radius * Math.cos(angle);
        let y = radius * Math.sin(angle);
        z += heightByStep;
        cordPoints.push(new THREE.Vector3(x, y, z));
        angle += angleByStep;
      }
      const geometry = new CordGeometry(cordPoints);

      cord.updateGeometry(geometry);
    }
    return true;
  }

  copy(source)
  {
    this.radius = source.radius;
    this.laps = source.laps;
    this.advance = source.advance;
    this.segments = source.segments;

    return this;
  }
};

ObjectBuilder.addClass(HelicoidBuilder);

export { HelicoidBuilder };


