/*
 * CordGeometry.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class CordGeometry extends THREE.BufferGeometry
{
  constructor(points = [], divisions = 24)
  {
    super();
    this.points = points; // THREE.Vector3[]
    this.type = "CordGeometry";
    this.divisions = divisions;
    this.updateBuffers();
  }

  updateBuffers()
  {
    const points = this.points;
    const positions = [];

    function addPoints(points)
    {
      let length = points.length - 1;
      for (let i = 0; i < length; i++)
      {
        let vertex = points[i];
        let nextVertex = points[(i + 1) % points.length];
        positions.push(vertex.x, vertex.y, vertex.z);
        positions.push(nextVertex.x, nextVertex.y, nextVertex.z);
      }
    }

    addPoints(points);

    this.setAttribute('position',
      new THREE.Float32BufferAttribute(positions, 3));
  }
}

export { CordGeometry };



