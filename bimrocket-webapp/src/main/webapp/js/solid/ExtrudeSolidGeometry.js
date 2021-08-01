/*
 * ExtrudeSolidGeometry.js
 *
 * @author realor
 */

import { SolidGeometry } from "../solid/SolidGeometry.js";
import * as THREE from "../lib/three.module.js";

class ExtrudeSolidGeometry extends SolidGeometry
{
  constructor(shape, settings)
  {
    super();
    this.type = "ExtrudeSolidGeometry";
    this.shape = shape;
    this.settings = settings; // depth, directrix: Vector3[]
    this.isManifold = true;
    this.build();
  }

  build()
  {
    if (this.vertices.length > 0) this.vertices = [];
    if (this.faces.length > 0) this.faces = [];

    const points = this.shape.extractPoints();
    let outerRing = points.shape;
    const innerRings = points.holes;

    // prepare shape, orient rings and remove duplicated vertices

    const removeDuplicatedVertex = ring =>
    {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first.equals(last))
      {
        ring.pop();
      }
    };

    removeDuplicatedVertex(outerRing);
    innerRings.forEach(removeDuplicatedVertex);

    if (THREE.ShapeUtils.isClockWise(outerRing))
    {
      outerRing = outerRing.reverse();
    }

    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];

      if (THREE.ShapeUtils.isClockWise(innerRing))
      {
        innerRings[h] = innerRing.reverse();
      }
    }

    const getPlane = (v1, v2, point) =>
    {
      let normal = new THREE.Vector3();
      if (Math.abs(v1.dot(v2)) > 0.9999)
      {
        normal = v1;
      }
      else
      {
        let s = new THREE.Vector3();
        s.subVectors(v2, v1).normalize();
        let v = new THREE.Vector3();
        v.crossVectors(s, v1).normalize();
        normal.crossVectors(s, v).normalize();
      }
      let plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(normal, point);

      return plane;
    };

    // triangulate shape

    const triangles = THREE.ShapeUtils.triangulateShape(outerRing, innerRings);
    let directrix = this.settings.directrix; // Point3D[]
    const depth = this.settings.depth || 1.0;
    if (directrix === undefined)
    {
      directrix = [];
      directrix.push(new THREE.Vector3(0, 0, 0));
      directrix.push(new THREE.Vector3(0, 0, depth));
    }
    else
    {
      // remove duplicated vertices
      let array = [];
      array.push(directrix[0]);
      for (let i = 1; i < directrix.length; i++)
      {
        if (directrix[i - 1].distanceTo(directrix[i]) > 0.0001)
        {
          array.push(directrix[i]);
        }
      }
      if (array.length < 2) return;
      directrix = array;
    }

    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const vs = new THREE.Vector3();
    const vx = new THREE.Vector3();
    const vy = new THREE.Vector3();
    const vz = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const ray = new THREE.Ray();

    // add fake point to generate last ring
    let length = directrix.length;
    vs.subVectors(directrix[length - 1], directrix[length - 2]);
    let last = new THREE.Vector3();
    last.copy(directrix[length - 1]).add(vs);
    directrix.push(last);

    // create matrix from initial segment of directrix
    p1.copy(directrix[0]);
    p2.copy(directrix[1]);
    vz.subVectors(p2, p1);
    vz.normalize();
    if (vz.y !== 0) vx.set(-vz.y, vz.x, 0).normalize();
    else if (vz.x !== 0) vx.set(vz.y, -vz.x, 0).normalize();
    else vx.set(1, 0, 0);
    vy.crossVectors(vz, vx);
    let matrix = new THREE.Matrix4();
		matrix.set(
		  vx.x, vy.x, vz.x, p1.x,
			vx.y, vy.y, vz.y, p1.y,
			vx.z, vy.z, vz.z, p1.z,
			0, 0, 0, 1);

    const addVertices = ring =>
    {
      for (let i = 0; i < ring.length; i++)
      {
        let vertex2 = ring[i];
        let vertex3 = new THREE.Vector3(vertex2.x, vertex2.y, 0);
        vertex3.applyMatrix4(matrix);
        this.vertices.push(vertex3);
      }
    };

    // add all ring vertices

    addVertices(outerRing);
    for (let h = 0; h < innerRings.length; h++)
    {
      let innerRing = innerRings[h];
      addVertices(innerRing);
    }

    // add bottom face (vertices1)
    for (let t = 0; t < triangles.length; t++)
    {
      let triangle = triangles[t];
      let a = triangle[0];
      let b = triangle[1];
      let c = triangle[2];
      this.addFace(c, b, a); // reverse face
    }

    let stepVertexCount = this.vertices.length;
    let offset1 = 0;
    let offset2 = stepVertexCount;
    // create side faces
    for (let i = 1; i < directrix.length - 1; i++)
    {
      p1.copy(directrix[i - 1]);
      p2.copy(directrix[i]);
      p3.copy(directrix[i + 1]);

      v1.subVectors(p2, p1).normalize();
      v2.subVectors(p3, p2).normalize();
      let plane = getPlane(v1, v2, p2);
      for (let i = 0; i < stepVertexCount; i++)
      {
        ray.set(this.vertices[offset1 + i], v1);
        let vertex = new THREE.Vector3();
        vertex = ray.intersectPlane(plane, vertex);
        if (vertex === null)
          throw "Can't extrude this shape for the given directrix";
        this.vertices.push(vertex);
      }

      // add outer ring side faces
      for (let i = 0; i < outerRing.length; i++)
      {
        let va1 = offset1 + i;
        let vb1 = offset1 + (i + 1) % outerRing.length;

        let va2 = offset2 + i;
        let vb2 = offset2 + (i + 1) % outerRing.length;

        this.addFace(va1, vb1, vb2, va2);
      }

      // add inner rings side faces

      let innerRingOffset = outerRing.length;
      for (let r = 0; r < innerRings.length; r++)
      {
        let innerRing = innerRings[r];

        for (let i = 0; i < innerRing.length; i++)
        {
          let va1 = offset1 + innerRingOffset + i;
          let vb1 = offset1 + innerRingOffset + (i + 1) % innerRing.length;

          let va2 = offset2 + innerRingOffset + i;
          let vb2 = offset2 + innerRingOffset + (i + 1) % innerRing.length;

          this.addFace(vb1, va1, va2, vb2); // reverse face
        }
        innerRingOffset += innerRing.length;
      }

      offset1 = offset2;
      offset2 += stepVertexCount;
    }

    // add top face (vertices2)
    for (let t = 0; t < triangles.length; t++)
    {
      let triangle = triangles[t];
      let a = triangle[0];
      let b = triangle[1];
      let c = triangle[2];
      this.addFace(offset1 + a, offset1 + b, offset1 + c);
    }
  }
};

export { ExtrudeSolidGeometry };
