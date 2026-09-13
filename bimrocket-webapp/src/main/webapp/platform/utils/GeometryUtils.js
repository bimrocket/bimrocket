/**
 * GeometryUtils.js
 *
 * @author realor
 */

import * as THREE from "three";

class GeometryUtils
{
  static PRECISION = 0.00001;
  static _vector1 = new THREE.Vector3();
  static _vector2 = new THREE.Vector3();
  static _vector3 = new THREE.Vector3();
  static _vector4 = new THREE.Vector3();
  static _vector5 = new THREE.Vector3();
  static _plane1 = new THREE.Plane();

  /**
   * Tests if the given point is on the specified segment.
   *
   * @param {THREE.Vector3} point - the point
   * @param {THREE.Vector3} pointA - the first point of the segment
   * @param {THREE.Vector3} pointB - the second point of the segment
   * @param {number} distance - the max distance to consider that point is on segment
   * @returns {boolean} - true if point is on segment, false otherwise
   */
  static isPointOnSegment(point, pointA, pointB, distance = 0.0001)
  {
    const projectedPoint = this._vector1;

    if (this.projectPointOnSegment(point, pointA, pointB, projectedPoint))
    {
      return projectedPoint.distanceToSquared(point) < distance * distance;
    }
    return false;
  }

  /**
   * Projects a point on the specified segment.
   *
   * @param {THREE.Vector3} point - the point
   * @param {THREE.Vector3} pointA - the first point of the segment
   * @param {THREE.Vector3} pointB - the second point of the segment
   * @param {THREE.Vector3} projectedPoint - the projected point (optional)
   * @returns {THREE.Vector3} the projected point or null if the point can not
   *   be projected on the segment
   */
  static projectPointOnSegment(point, pointA, pointB, projectedPoint)
  {
    const vAB = this._vector2;
    const vAP = this._vector3;
    const vProjAB = this._vector4;

    vAB.subVectors(pointB, pointA);
    vAP.subVectors(point, pointA);

    const denominator = vAB.lengthSq();

    if (denominator === 0) return null;

		const scalar = vAB.dot(vAP) / denominator;

    if (scalar >= 0 && scalar <= 1)
    {
		  vProjAB.copy(vAB).multiplyScalar(scalar);

      if (!(projectedPoint instanceof THREE.Vector3))
      {
        projectedPoint = new THREE.Vector3();
      }
      projectedPoint.copy(pointA).add(vProjAB);

      return projectedPoint;
    }
    return null;
  }

  /**
   * Intersects 2 lines.
   *
   * @param {THREE.Line} line1 - the first line
   * @param {THREE.Line} line2 - the second line
   * @param {THREE.Vector3} position1 - the closest point of line1 to line2
   * @param {THREE.Vector3} position2 - the closest point of line2 to line1
   * @returns {number} the distance between position1 and position 2 or -1 if
   *   lines do not intersect.
   */
  static intersectLines(line1, line2, position1, position2)
  {
    const vector1 = GeometryUtils._vector1;
    const vector2 = GeometryUtils._vector2;
    const normal = GeometryUtils._vector5;
    const plane = GeometryUtils._plane1;
    position1 = position1 || GeometryUtils._vector3;
    position2 = position2 || GeometryUtils._vector4;

    vector1.subVectors(line1.end, line1.start).normalize();
    vector2.subVectors(line2.end, line2.start).normalize();

    if (Math.abs(vector1.dot(vector2)) < 0.9999) // are not parallel
    {
      normal.copy(vector1).cross(vector2).normalize();

      vector1.cross(normal).normalize();
      plane.setFromNormalAndCoplanarPoint(vector1, line1.start);
      if (plane.intersectLine(line2, position2))
      {
        vector2.cross(normal).normalize();
        plane.setFromNormalAndCoplanarPoint(vector2, line2.start);
        if (plane.intersectLine(line1, position1))
        {
          return position1.distanceTo(position2);
        }
      }
    }
    return -1;
  }

  /**
   * Calculates the centroid of a vertex array.
   *
   * @param {THREE.Vector3[]} vertexPositions - the vertex array
   * @param {function} accessFn - the function to access the vertex (optional)
   * @param {THREE.Vector3} centroid - the calculated centroid (optional)
   * @returns {THREE.Vector3} the calculated centroid
   */
  static centroid(vertexPositions, accessFn, centroid)
  {
    if (!(centroid instanceof THREE.Vector3)) centroid = new THREE.Vector3();
    else centroid.set(0, 0, 0);

    const count = vertexPositions.length;
    let point;
    for (let i = 0; i < count; i++)
    {
      if (accessFn)
      {
        point = accessFn(vertexPositions[i]);
      }
      else
      {
        point = vertexPositions[i];
      }
      centroid.x += point.x;
      centroid.y += point.y;
      centroid.z += point.z;
    }
    centroid.x /= count;
    centroid.y /= count;
    centroid.z /= count;

    return centroid;
  }

  /**
   * Calculates the normal of a vertex array using the Newell's method.
   *
   * @param {THREE.Vector3[]} vertexPositions - the vertex array
   * @param {function} accessFn - the function to access the vertex (optional)
   * @param {THREE.Vector3} normal - the calculated normal (optional)
   * @returns {THREE.Vector3} the calculated normal
   */
  static calculateNormal(vertexPositions, accessFn, normal)
  {
    if (!(normal instanceof THREE.Vector3)) normal = new THREE.Vector3();
    else normal.set(0, 0, 0);

    const count = vertexPositions.length;
    let pi, pj;
    for (let i = 0; i < count; i++)
    {
      let j = (i + 1) % count;
      if (accessFn)
      {
        pi = accessFn(vertexPositions[i]);
        pj = accessFn(vertexPositions[j]);
      }
      else
      {
        pi = vertexPositions[i];
        pj = vertexPositions[j];
      }
      normal.x += (pi.y - pj.y) * (pi.z + pj.z);
      normal.y += (pi.z - pj.z) * (pi.x + pj.x);
      normal.z += (pi.x - pj.x) * (pi.y + pj.y);
    }
    normal.normalize();
    return normal;
  }

  /**
   * Converts a local normal to WCS.
   *
   * @param {THREE.Vector3} normal - vector to convert to WCS
   * @param {THREE.Matrix4} matrixWorld - the matrix where normal is referenced
   * @param {THREE.Vector3} worldNormal - the output normal
   * @returns {THREE.Vector3} the worldNormal
   */
  static getWorldNormal(normal, matrixWorld, worldNormal)
  {
    if (!(worldNormal instanceof THREE.Vector3))
    {
      worldNormal = new THREE.Vector3();
    }

    const v0 = this._vector1;
    const v1 = this._vector2;

    v0.setFromMatrixPosition(matrixWorld);
    v1.copy(normal).applyMatrix4(matrixWorld);
    v1.sub(v0).normalize();
    worldNormal.copy(v1);

    return worldNormal;
  }

  /**
   * Returns the center of a circle that passes through the 3 given points.
   *
   * @param {THREE.Vector2} point1
   * @param {THREE.Vector2} point2
   * @param {THREE.Vector2} point3
   * @returns {THREE.Vector2} the center of the circle
   */
  static getCircleCenter(point1, point2, point3)
  {
    const x1 = point1.x;
    const y1 = point1.y;
    const x2 = point2.x;
    const y2 = point2.y;
    const x3 = point3.x;
    const y3 = point3.y;

    const x1_2 = x1 * x1;
    const x2_2 = x2 * x2;
    const x3_2 = x3 * x3;
    const y1_2 = y1 * y1;
    const y2_2 = y2 * y2;
    const y3_2 = y3 * y3;

    const t1 = (x2_2 + y2_2 - x3_2 - y3_2);
    const t2 = (x1_2 + y1_2 - x2_2 - y2_2);

    const xc = ((y2 - y1) * t1 - (y3 - y2) * t2) /
      (2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)));

    const yc = ((x2 - x1) * t1 - (x3 - x2) * t2) /
      (2 * (y1 * (x2 - x3) + y2 * (x3 - x1) + y3 * (x1 - x2)));

    if (!isFinite(xc) || !isFinite(yc)) return null;

    return new THREE.Vector2(xc, yc);
  }

  /**
   * Returns the offset vector that should be subtracted from the given point
   * to avoid lost of precision when its coordinates are represented with float32.
   *
   * @param {THREE.Vector2 | THREE.Vector3} point
   * @returns {THREE.Vector3} the offsetVector
   */
  static getOffsetVectorForFloat32(point)
  {
    const maxCoord = 10000;
    let offsetVector = null;

    let xOverflow = Math.abs(point.x) > maxCoord;
    let yOverflow = Math.abs(point.y) > maxCoord;
    let zOverflow = point.isVector3 && Math.abs(point.z) > maxCoord;

    if (xOverflow || yOverflow || zOverflow)
    {
      offsetVector = new THREE.Vector3();
      if (xOverflow) offsetVector.x = point.x;
      if (yOverflow) offsetVector.y = point.y;
      if (zOverflow) offsetVector.z = point.z;
    }
    return offsetVector;
  }

  /**
   * Subtracts offsetVector from the points of the given rings.
   *
   * @param {THREE.Vector3} offsetVector
   * @param {THREE.Vector2[] | THREE.Vector3[]} rings
   */
  static offsetRings(offsetVector, ...rings)
  {
    for (let ring of rings)
    {
      for (let i = 0; i < ring.length - 1; i++)
      {
        ring[i].sub(offsetVector);
      }
      if (ring[0] !== ring[ring.length - 1])
      {
        ring[ring.length - 1].sub(offsetVector);
      }
    }
  }

  /**
   * Clones an array of Vector2 or Vector3.
   *
   * @param {THREE.Vector2[] | THREE.Vector3[]} ring - the array of vectors
   * @returns {THREE.Vector2[] | THREE.Vector3} the cloned ring
   */
  static cloneRing(ring)
  {
    if (!(ring instanceof Array)) return ring;

    const clonedRing = [];

    for (let vector of ring)
    {
      clonedRing.push(vector.clone());
    }
    return clonedRing;
  }

  /**
   * Add nextPoints to points without repeating vertices.
   *
   * @param {THREE.Vector2[] | THREE.Vector3[]} points - the array of vectors
   * @param {THREE.Vector2[] | THREE.Vector3[]} nextPoints - the array of vectors
   */
  static joinPointArrays(points, nextPoints)
  {
    if (nextPoints.length === 0)
    {
      // nothing to do
    }
    else if (points.length === 0)
    {
      points.push(...nextPoints);
    }
    else
    {
      const lastPoint = points[points.length - 1];
      const nextPoint = nextPoints[0];
      let start = lastPoint.equals(nextPoint) ? 1 : 0;
      for (let i = start; i < nextPoints.length; i++)
      {
        points.push(nextPoints[i]);
      }
    }
  }

  /**
   * Triangulates a planar 3d face with holes.
   *
   * @param {THREE.Vector3[]} vertices - the external contour of the face
   * @param {THREE.Vector3[][]} holes - the vertices of the holes
   * @param {THREE.Vector3} normal - the face normal (optional)
   * @returns {number[][]} array of triangles [i0, i1, i2] where ix is
   *   an index to a face vertex
   */
  static triangulateFace(vertices, holes, normal)
  {
    const vx = GeometryUtils._vector1;
    const vy = GeometryUtils._vector2;
    const vz = GeometryUtils._vector3;

    if (normal instanceof THREE.Vector3)
    {
      vz.copy(normal);
    }
    else
    {
      GeometryUtils.calculateNormal(vertices, undefined, vz);
    }
    const v0 = vertices[0];
    const v1 = vertices[1];
    vx.subVectors(v1, v0).normalize();
    vy.crossVectors(vz, vx);

    const matrix = new THREE.Matrix4();
    matrix.set(vx.x, vy.x, vz.x, v0.x,
             vx.y, vy.y, vz.y, v0.y,
             vx.z, vy.z, vz.z, v0.z,
             0, 0, 0, 1).invert();

    const projectVertices = (vertices) =>
    {
      let projectedVertices = [];
      for (let vertex of vertices)
      {
        let point = new THREE.Vector3();
        point.copy(vertex);
        projectedVertices.push(point.applyMatrix4(matrix));
      }
      return projectedVertices;
    };

    let projectedVertices = projectVertices(vertices);
    let projectedHoles = [];
    for (let hole of holes)
    {
      projectedHoles.push(projectVertices(hole));
    }

    return THREE.ShapeUtils.triangulateShape(projectedVertices, projectedHoles);
  }

  /**
   * Finds the point of intersection between a segment and a plane.
   *
   * @param {THREE.Vector3} v1 - the first point of the segment
   * @param {THREE.Vector3} v2 - the second point of the segment
   * @param {THREE.Plane} plane - the plane
   * @param {number} epsilon - the max distance to consider intersection
   * @returns {THREE.Vector3} the intersection point or null if they do not
   *   intersect
   */
  static intersectLinePlane(v1, v2, plane, epsilon = 0.00001)
  {
    let v21 = v2.clone().sub(v1);

    let d = plane.normal.dot(v21);

    if (Math.abs(d) < epsilon) return null;

    let t = -(plane.normal.dot(v1) + plane.constant) / d;

    if (t < -epsilon || t > 1 + epsilon) return null;

    return v21.multiplyScalar(t).add(v1);
  }

  /**
   * Returns an orthogonal vector.
   *
   * @param {THREE.Vector3} vector - the input vector
   * @param {THREE.Vector3} orthoVector - the output vector
   * @returns {THREE.Vector3} ortho - an orthogonal vector of the given vector
   */
  static orthogonalVector(vector, orthoVector)
  {
    if (!(orthoVector instanceof THREE.Vector3))
    {
      orthoVector = new THREE.Vector3();
    }

    if (Math.abs(vector.x) > 0.1)
    {
      orthoVector.set(vector.y, -vector.x, vector.z);
    }
    else if (Math.abs(vector.y) > 0.1)
    {
      orthoVector.set(-vector.y, vector.x, vector.z);
    }
    else // (~0, ~0, z)
    {
      orthoVector.set(-vector.z, vector.y, vector.x);
    }
    return orthoVector.cross(vector);
  }

  /**
   * Calculates the area of a BufferGeometry.
   *
   * @param {THREE.BufferGeometry} geometry - the BufferGeometry
   * @param {THREE.Matrix4} matrix - the matrix to apply to geometry vertices
   * @returns {number} area - the area of the BufferGeometry
   */
  static getBufferGeometryArea(geometry, matrix)
  {
    const triangle = new THREE.Triangle();
    const position = this._vector1;
    const vertices = geometry.attributes.position.array;

    function getVertex(index)
    {
      position.x = vertices[3 * index];
      position.y = vertices[3 * index + 1];
      position.z = vertices[3 * index + 2];
      if (matrix) position.applyMatrix4(matrix);
      return position;
    }

    let area = 0;

    this.getBufferGeometryFaces(geometry, (va, vb, vc) =>
    {
      triangle.a.copy(getVertex(va));
      triangle.b.copy(getVertex(vb));
      triangle.c.copy(getVertex(vc));
      area += triangle.getArea();
    });
    return area;
  }

  static traverseBufferGeometryVertices(geometry, callback)
  {
    const position = this._vector1;
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3)
    {
      position.x = positions[i];
      position.y = positions[i + 1];
      position.z = positions[i + 2];

      callback(position);
    }
  }

  static getBufferGeometryVertices(geometry)
  {
    const positions = geometry.attributes.position.array;
    const vertices = [];
    for (let i = 0; i < positions.length; i += 3)
    {
      let x = positions[i];
      let y = positions[i + 1];
      let z = positions[i + 2];
      vertices.push(new THREE.Vector3(x, y, z));
    }
    return vertices;
  }

  static getBufferGeometryFaces(geometry, addFace)
  {
    const positions = geometry.attributes.position.array;
    if (geometry.index) // indexed geometry
    {
      let indices = geometry.index.array;
      for (let i = 0; i < indices.length; i += 3)
      {
        let va = indices[i];
        let vb = indices[i + 1];
        let vc = indices[i + 2];

        addFace(va, vb, vc);
      }
    }
    else // non indexed geometry
    {
      var vertexCount = positions.length / 3;
      for (let i = 0; i < vertexCount; i += 3)
      {
        let va = i;
        let vb = i + 1;
        let vc = i + 2;

        addFace(va, vb, vc);
      }
    }
  }

  /**
   * Simplified version of BufferGeometryUtils.mergeBufferGeometries.
   *
   * @param {THREE.BufferGeometry[]} geometries to merge
   * @param {boolean} useGroups
   * @return {THREE.BufferGeometry} the merged geometry
   */
  static mergeBufferGeometries(geometries, useGroups = false)
  {
    const isIndexed = geometries[0].index !== null;
    const attributesUsed = new Set(Object.keys(geometries[0].attributes));
    const attributes = {};
    const mergedGeometry = new THREE.BufferGeometry();

    let offset = 0;

    for (let i = 0; i < geometries.length; ++i)
    {
      const geometry = geometries[i];
      let attributesCount = 0;

      // ensure that all geometries are indexed, or none

      if (isIndexed !== (geometry.index !== null))
      {
        console.error('Not common attributes');
        return null;
      }

      // gather attributes, exit early if they're different
      for (const name in geometry.attributes)
      {
        if (!attributesUsed.has(name))
        {
          console.error('Not common attributes');
          return null;
        }

        if (attributes[name] === undefined)
        {
          attributes[name] = [];
        }

        attributes[name].push(geometry.attributes[name]);
        attributesCount++;
      }

      // ensure geometries have the same number of attributes

      if (attributesCount !== attributesUsed.size)
      {
        console.error('Not all geometries have the same number of attributes.');
        return null;
      }

      // gather .userData

      mergedGeometry.userData.mergedUserData =
        mergedGeometry.userData.mergedUserData || [];
      mergedGeometry.userData.mergedUserData.push(geometry.userData);

      if (useGroups)
      {
        let count;

        if (isIndexed)
        {
          count = geometry.index.count;
        }
        else if (geometry.attributes.position !== undefined)
        {
          count = geometry.attributes.position.count;
        }
        else
        {
          console.error('Geometry has not an index or a position attribute');
          return null;
        }
        mergedGeometry.addGroup(offset, count, i);
        offset += count;
      }
    }

    // merge indices

    if (isIndexed)
    {
      let indexOffset = 0;
      const mergedIndex = [];

      for (let i = 0; i < geometries.length; ++i)
      {
        const index = geometries[i].index;

        for (let j = 0; j < index.count; ++j)
        {
          mergedIndex.push(index.getX(j) + indexOffset);
        }
        indexOffset += geometries[i].attributes.position.count;
      }
      mergedGeometry.setIndex(mergedIndex);
    }

    // merge attributes

    for (const name in attributes)
    {
      const mergedAttribute = this.mergeBufferAttributes(attributes[name]);

      if (!mergedAttribute)
      {
        console.error('Failed while merging the ' + name + ' attribute.');
        return null;
      }
      mergedGeometry.setAttribute(name, mergedAttribute);
    }
    return mergedGeometry;
  }

  /**
   * Merges the buffer attributes.
   *
   * @param {BufferAttribute[]} attributes
   * @return {BufferAttribute}
   */
  static mergeBufferAttributes(attributes)
  {
    let TypedArray;
    let itemSize;
    let normalized;
    let arrayLength = 0;

    for (let i = 0; i < attributes.length; ++i)
    {
      const attribute = attributes[ i ];

      if (attribute.isInterleavedBufferAttribute)
      {
        console.error('InterleavedBufferAttributes are not supported.');
        return null;
      }

      if (TypedArray === undefined)
      {
        TypedArray = attribute.array.constructor;
      }

      if (TypedArray !== attribute.array.constructor)
      {
        console.error('BufferAttribute.array is not consistent.');
        return null;
      }

      if (itemSize === undefined)
      {
        itemSize = attribute.itemSize;
      }

      if (itemSize !== attribute.itemSize)
      {
        console.error('BufferAttribute.itemSize is not consistent.');
        return null;
      }

      if (normalized === undefined)
      {
        normalized = attribute.normalized;
      }

      if (normalized !== attribute.normalized)
      {
        console.error('BufferAttribute.normalized is not consistent.');
        return null;
      }
      arrayLength += attribute.array.length;
    }

    const array = new TypedArray(arrayLength);
    let offset = 0;

    for (let i = 0; i < attributes.length; ++i)
    {
      array.set(attributes[i].array, offset);
      offset += attributes[i].array.length;
    }
    return new THREE.BufferAttribute(array, itemSize, normalized);
  }
}

export { GeometryUtils };
