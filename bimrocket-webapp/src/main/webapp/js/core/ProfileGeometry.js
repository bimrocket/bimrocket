/**
 * ProfileGeometry.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class ProfileGeometry extends THREE.BufferGeometry
{
  constructor(path)
  {
    super();
    this.path = path; // Path or Shape
    this.type = "ProfileGeometry";
    this.divisions = 12;
    this.updateBuffers();
  }

  isClosed()
  {
    return this.path instanceof THREE.Shape;
  }

  updateBuffers()
  {
    const path = this.path;
    let closed = path instanceof THREE.Shape;

    const points = path.getPoints(this.divisions);
    const pointsHoles = closed ? path.getPointsHoles(this.divisions) : [];
    const positions = [];

    function addPoints(points)
    {
      let length = closed ? points.length : points.length - 1;
      for (let i = 0; i < length; i++)
      {
        let vertex = points[i];
        let nextVertex = points[(i + 1) % points.length];
        positions.push(vertex.x, vertex.y, 0);
        positions.push(nextVertex.x, nextVertex.y, 0);
      }
    }

    addPoints(points);
    for (let pointsHole of pointsHoles)
    {
      addPoints(pointsHole);
    }

    this.setAttribute('position',
      new THREE.Float32BufferAttribute(positions, 3));
  }
}

export { ProfileGeometry };



