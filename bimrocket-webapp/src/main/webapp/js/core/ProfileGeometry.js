/**
 * ProfileGeometry.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class ProfileGeometry extends THREE.BufferGeometry
{
  /* a ProfileGeometry is an BufferGeometry that holds a 2D path */

  constructor(path, divisions = 24)
  {
    super();
    this.path = path; // THREE.Path or THREE.Shape
    this.type = "ProfileGeometry";
    this.divisions = divisions;
    this.updateBuffers();
  }

  isClosed()
  {
    return this.path instanceof THREE.Shape;
  }

  updateBuffers()
  {
    const path = this.path;
    const closed = path instanceof THREE.Shape;
    const points = path.getPoints(this.divisions); // if closed, last === first
    const positions = [];

    function addPoints(points)
    {
      let length = points.length - 1;
      for (let i = 0; i < length; i++)
      {
        let vertex = points[i];
        let nextVertex = points[i + 1];
        positions.push(vertex.x, vertex.y, 0);
        positions.push(nextVertex.x, nextVertex.y, 0);
      }
    }

    addPoints(points);
    if (closed)
    {
      const pointsHoles = path.getPointsHoles(this.divisions);

      for (let pointsHole of pointsHoles)
      {
        addPoints(pointsHole);
      }
    }

    this.setAttribute('position',
      new THREE.Float32BufferAttribute(positions, 3));
  }
}

export { ProfileGeometry };



