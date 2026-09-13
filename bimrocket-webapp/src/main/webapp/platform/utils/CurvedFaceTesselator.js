/*
 * CurvedFaceTesselator.js
 *
 * @author realor
 */

import { GeometryUtils } from "platform/utils/GeometryUtils.js";
import * as THREE from "three";

const PI_2 = Math.PI * 2;

class CurvedFaceTesselator
{
  constructor(matrix)
  {
    this.matrix = matrix;
    this.inverseMatrix = matrix.clone().invert();
  }

  /**
   * Tesselates a curved face represented by its 3d boundary.
   *
   * @param {THREE.Vector3[]} faceVertices - the 3d boundary of the curved face
   * @param {THREE.Vector3[][]} holes - the 3d boundaries of the face holes
   * @returns {THREE.Vector3[][]} the output faces (triangles or quads)
   */
  tesselate(faceVertices, holes)
  {
    const PI_2 = Math.PI * 2;

    const auxArray = [];

    const createRib = (vertex) =>
    {
      const { u, onAxis } = this.getUV(vertex, true);
      if (onAxis) return;

      const rib = new Rib(u, vertex);
      auxArray.push(rib);
    };

    // create auxiliary ribs
    faceVertices.forEach(vertex => createRib(vertex));

    // sort auxiliary ribs by u (normalized angle)
    auxArray.sort((a, b) => a.u - b.u);

    // compact ribs (remove ribs too close)
    const epsilon = 0.001;

    let ribArray = [];
    let i = 0;
    let j = 1;
    let rib1 = auxArray[i];
    ribArray.push(rib1);
    while (j < auxArray.length)
    {
      let rib2 = auxArray[j];
      if (rib2.u - rib1.u > epsilon)
      {
        rib1 = rib2;
        ribArray.push(rib1);
        i = j;
      }
      j++;
    }
    const last = auxArray.length - 1;
    if (i < last)
    {
      ribArray.push(auxArray[last]);
    }

    // find the 2 consecutive ribs whose angular difference is maximum
    let maxDif = 0;
    let splitIndex = 0;
    for (let i = 0; i < ribArray.length; i++)
    {
      let nu1 = ribArray[i].u;
      let nu2 = ribArray[(i + 1) % ribArray.length].u;
      let dif =  Math.abs(nu1 - nu2);
      dif = Math.min(dif, PI_2 - dif);

      if (dif > maxDif)
      {
        splitIndex = i + 1;
        maxDif = dif;
      }
    }

    // reorder ribs is necessary
    if (splitIndex < ribArray.length)
    {
      ribArray = ribArray.slice(splitIndex).concat(ribArray.slice(0, splitIndex));
    }

    // find vMin, vMax for each rib
    ribArray.forEach(rib => this.findVMinMaxForRib(rib, faceVertices));

    // generate faces
    const faces = [];
    const plane = new THREE.Plane();

    for (let i = 0; i < ribArray.length - 1; i++)
    {
      const rib1 = ribArray[i];
      const rib2 = ribArray[i + 1];

      const ribPoints1 = this.getRibPoints(rib1.u, rib1.vMin, rib1.vMax);
      const ribPoints2 = this.getRibPoints(rib2.u, rib2.vMin, rib2.vMax);

      if (ribPoints1.length + ribPoints2.length < 3) continue;

      let r1 = 0;
      let r2 = 0;

      while (r1 < ribPoints1.length || r2 < ribPoints2.length)
      {
        let p11 = ribPoints1[r1];
        let p12 = ribPoints1[r1 + 1];

        let p21 = ribPoints2[r2];
        let p22 = ribPoints2[r2 + 1];

        if (p11 && p12 && p21 && p22) // have 4 vertices
        {
          plane.setFromCoplanarPoints(p11, p21, p22);
          if (plane.distanceToPoint(p12) < 0.00001) // are coplanar?
          {
            faces.push([p11, p21, p22, p12]); // generate quad face
          }
          else // generate 2 triangles instead
          {
            faces.push([p11, p21, p22]);
            faces.push([p11, p22, p12]);
          }
          r1++;
          r2++;
        }
        else if (p11 && p12 && p21)
        {
          faces.push([p11, p21, p12]);
          r1++;
        }
        else if (p11 && p21 && p22)
        {
          faces.push([p11, p21, p22]);
          r2++;
        }
        else
        {
          r1++;
          r2++;
        }
      }
    }
    return faces;
  }

  /**
   * Calculates the vMin and vMax for the given rib.
   *
   * @param {Rib} rib - the rib from which to calculate the v values.
   * @param {THREE.Vector3[]} faceVertices - the 3d boundary of the curved face
   * @param {THREE.Vector3[][]} holes - the 3d boundaries of the face holes
   */
  findVMinMaxForRib(rib, faceVertices, holes)
  {
    const vertex = rib.vertex;
    const axis = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const vector = new THREE.Vector3();
    const [p1, p2] = this.getAxisPoints();
    axis.subVectors(p2, p1);
    vector.subVectors(vertex, p1).cross(axis);
    normal.copy(axis).cross(vector);

    rib.vMin = Infinity;
    rib.vMax = -Infinity;

    const plane = new THREE.Plane();
    plane.setFromCoplanarPoints(p1, p2, vertex);

    for (let i = 0; i < faceVertices.length - 1; i++)
    {
      let pe1 = faceVertices[i];
      let pe2 = faceVertices[i + 1];
      let p;

      if (Math.abs(plane.distanceToPoint(pe1)) < 0.0001)
      {
        p = pe1;
      }
      else if (Math.abs(plane.distanceToPoint(pe2)) < 0.0001)
      {
        p = pe2;
      }
      else
      {
        p = GeometryUtils.intersectLinePlane(pe1, pe2, plane);
      }
      if (p)
      {
        vector.subVectors(p, p1);

        if (normal.dot(vector) > -0.0001)
        {
          let { v } = this.getUV(p);
          if (v !== undefined)
          {
            if (v < rib.vMin) rib.vMin = v;
            if (v > rib.vMax) rib.vMax = v;
          }
        }
      }
    }
  }

  /**
   * Calculates the {u, v} parameters for the given vertex.
   *
   * @param {THREE.Vector3} vertex - the vertex from which to calculate the parameters
   * @param {boolean} onlyU - when true only the u parameter is calculated
   * @returns {{u: number, v: number, onAxis: boolean} the vertex parameters
   */
  getUV(vertex, onlyU)
  {
    throw "getUV(vertex): not implemented";
  }

  /**
   * Generates the rib vertices for the given parameters.
   *
   * @param {number} u - the u parameter (angle)
   * @param {number} vMin - the minimum v parameter
   * @param {number} vMax - the maximim v parameter
   * @returns {THREE.Vector3[]} the rib vertices
   */
  getRibPoints(u, vMin, vMax)
  {
    throw "getRibPoints(u, vMin, vMax): not implemented";
  }

  /**
   * Returns 2 points on the axis of revolution of the face surface.
   *
   * @returns {THREE.Vector3[]} - 2 points on the axis of revolution of the surface
   */
  getAxisPoints()
  {
    throw "getAxisPoints(): not implemented";
  }
}

class CylindricalFaceTesselator extends CurvedFaceTesselator
{
  constructor(matrix, radius)
  {
    super(matrix);
    this.radius = radius;
  }

  getUV(vertex)
  {
    const p = new THREE.Vector3();
    p.copy(vertex).applyMatrix4(this.inverseMatrix);
    const angle = Math.atan2(p.y, p.x);

    return { u: angle, v: p.z, onAxis: false };
  }

  getRibPoints(u, vMin, vMax)
  {
    const ca = Math.cos(u) * this.radius;
    const sa = Math.sin(u) * this.radius;

    const p1 = new THREE.Vector3(ca, sa, vMin).applyMatrix4(this.matrix);
    const p2 = new THREE.Vector3(ca, sa, vMax).applyMatrix4(this.matrix);

    return [p1, p2];
  }

  getAxisPoints()
  {
    if (!this.axisPoints)
    {
      const matrix = this.matrix;

      const p1 = new THREE.Vector3();
      p1.setFromMatrixPosition(this.matrix);

      const p2 = new THREE.Vector3(
        matrix.elements[8] + p1.x,
        matrix.elements[9] + p1.y,
        matrix.elements[10] + p1.z);

      this.axisPoints = [p1, p2];
    }
    return this.axisPoints;
  }
}

class RevolutionFaceTesselator extends CurvedFaceTesselator
{
  constructor(matrix, location, axis, profile)
  {
    super(matrix);
    this.location = location;
    this.axis = axis;

    let vz = axis.clone();
    let vx, vy;
    if (profile.length > 2)
    {
      vy = GeometryUtils.calculateNormal(profile);
    }
    else
    {
      vy = new THREE.Vector3().copy(profile[1]).sub(profile[0])
           .cross(vz).normalize();
    }
    vx = vy.clone().cross(vz);

    const axisMatrix = new THREE.Matrix4();
    axisMatrix.makeBasis(vx, vy, vz);
    axisMatrix.setPosition(location);
    this.axisMatrix = axisMatrix;
    this.axisInverseMatrix = axisMatrix.clone().invert();

    this.profile = [];
    for (let p of profile)
    {
      let pp = p.clone().applyMatrix4(this.axisInverseMatrix);
      if (pp.x < 0) pp.x = -pp.x;
      pp.y = pp.z;
      pp.z = 0;
      this.profile.push(pp);
    }
    const size = this.profile.length;
    const heightDif = this.profile[0].y - this.profile[size - 1].y;
    if (heightDif > 0.001)
    {
      // orient profile
      this.profile.reverse();
    }
  }

  getUV(vertex, onlyU = false)
  {
    const p = new THREE.Vector3();
    p.copy(vertex).applyMatrix4(this.inverseMatrix);
    const q = new THREE.Vector3();
    q.copy(p).applyMatrix4(this.axisInverseMatrix);

    const onAxis = Math.abs(q.x) < 0.00001 && Math.abs(q.y) < 0.00001;
    const angle = Math.atan2(q.y, q.x);

    let length;
    if (!onlyU)
    {
      const radius = Math.sqrt(q.x * q.x + q.y * q.y);
      const elevation = q.z;

      const r = new THREE.Vector3();
      r.set(radius, elevation, 0);
      length = this.getLengthForProfileVertex(r);
    }
    return { u: angle, v: length, onAxis };
  }

  getRibPoints(u, vMin, vMax)
  {
    const matrix = this.matrix;
    const axisMatrix = this.axisMatrix;
    const location = this.location;
    const profile = this.profile; // profile2d
    const ca = Math.cos(u);
    const sa = Math.sin(u);
    const points = [];

    const addPoint = p =>
    {
      const radius = p.x;
      const elevation = p.y;
      const x = radius * ca;
      const y = radius * sa;
      const point = new THREE.Vector3(x, y, elevation);
      point.applyMatrix4(axisMatrix).applyMatrix4(matrix);
      points.push(point);
    };

    const iMin = Math.floor(vMin);
    const fMin = vMin - iMin;

    const iMax = Math.floor(vMax);
    const fMax = vMax - iMax;

    let index = iMin;

    if (fMin > 0.00001)
    {
      let p1 = profile[iMin];
      let p2 = profile[iMin + 1];
      addPoint(p1.clone().lerp(p2, fMin));
      index++;
    }

    while (index <= iMax)
    {
      addPoint(profile[index++]);
    }

    if (fMax > 0.00001)
    {
      let p1 = profile[iMax];
      let p2 = profile[iMax + 1];
      addPoint(p1.clone().lerp(p2, fMax));
    }
    return points;
  }

  getAxisPoints()
  {
    if (!this.axisPoints)
    {
      const axis = this.axis;
      const location = this.location;
      const matrix = this.matrix;

      const p1 = new THREE.Vector3();
      p1.copy(location).applyMatrix4(matrix);

      const p2 = new THREE.Vector3();
      p2.copy(location).add(axis).applyMatrix4(matrix);

      this.axisPoints = [p1, p2];
    }
    return this.axisPoints;
  }

  getLengthForProfileVertex(vertex)
  {
    const profile = this.profile; // 2D profile
    let p1;
    let p2;
    const projectedPoint = new THREE.Vector3();
    let minDistance = Infinity;
    let minLength = 0;
    let distance;
    for (let i = 0; i < profile.length - 1; i++)
    {
      p1 = profile[i];
      p2 = profile[i + 1];
      distance = vertex.distanceTo(p1);
      if (distance < minDistance)
      {
        minDistance = distance;
        minLength = i;
      }
      if (GeometryUtils.projectPointOnSegment(vertex, p1, p2, projectedPoint))
      {
        distance = vertex.distanceTo(projectedPoint);
        if (distance < minDistance)
        {
          let segmentLength = p1.distanceTo(p2);
          let factor = p1.distanceTo(projectedPoint) / segmentLength;
          if (factor > 0 && factor < 1)
          {
            minDistance = distance;
            minLength = i + factor;
          }
        }
      }
    }
    p2 = profile[profile.length - 1]; // last vertex
    distance = vertex.distanceTo(p2);
    if (distance < minDistance)
    {
      minDistance = distance;
      minLength = profile.length - 1;
    }
    return minLength;
  }
}

class Rib
{
  constructor(u, vertex)
  {
    this.u = u < 0 ? u + PI_2 : u; // u >= 0
    this.vertex = vertex;
    this.vMin = Infinity;
    this.vMax = -Infinity;
  }
}

export { CylindricalFaceTesselator, RevolutionFaceTesselator };
