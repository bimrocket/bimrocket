/*
 * SpringBuilder.js
 *
 *  @author realor
 */

import { ObjectBuilder } from "../ObjectBuilder.js";
import { Cord } from "../Cord.js";
import { CordGeometry } from "../CordGeometry.js";
import * as THREE from "../../lib/three.module.js";

class SpringBuilder extends ObjectBuilder
{
  constructor(radius = 1, laps = 4, advance = 1, segments = 32)
  {
    super();
    this.radius = radius;
    this.laps = laps;
    this.advance = advance;
    this.segments = segments;
  }

  traverseDependencies()
  {
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

};

export { SpringBuilder };


