/*
 * SolidGeometry.js
 *
 * @author: realor
 */

import * as THREE from "../lib/three.module.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";

class SolidGeometry extends THREE.BufferGeometry
{
  static INDEXED_TRIANGLES = 0;
  static TRIANGLE_SOUP = 1;

  constructor()
  {
    super();
    this.type = "SolidGeometry";
    this.vertices = []; // THREE.Vector3
    this.faces = []; // Face
    this.isManifold = false;
    this.generationMode = SolidGeometry.TRIANGLE_SOUP;
  }

  addFace(...vertices)
  {
    let face = new Face(this);
    for (let i = 0; i < vertices.length; i++)
    {
      let vertex = vertices[i];
      face.addVertex(vertex);
    }
    face.updateNormal();
    this.faces.push(face);

    return face;
  }

  updateFaceNormals()
  {
    for (let f = 0; f < this.faces.length; f++)
    {
      this.faces[f].updateNormal();
    }
  }

  update()
  {
    if (this.generationMode === this.constructor.INDEXED_TRIANGLES)
    {
      this.setFromPoints(this.vertices);

      const indices = [];
      for (let i = 0; i < this.faces.length; i++)
      {
        let face = this.faces[i];
        let vertexCount = face.getVertexCount();
        for (let j = 2; j < vertexCount; j++)
        {
          indices.push(face.indices[0]);
          indices.push(face.indices[j - 1]);
          indices.push(face.indices[j]);
        }
      }
      this.setIndex(indices);
    }
    else // TRIANGLE_SOUP
    {
      var vertices = this.vertices;
      var triangles = [];
      var normals = [];

      for (let f = 0; f < this.faces.length; f++)
      {
        let face = this.faces[f];
        if (face.normal === null) face.updateNormal();
        let normal = face.normal;
        let vertexCount = face.getVertexCount();
        for (let n = 2; n < vertexCount; n++)
        {
          let vertex0 = face.getVertex(0);
          let vertex1 = face.getVertex(n - 1);
          let vertex2 = face.getVertex(n);

          triangles.push(vertex0.x, vertex0.y, vertex0.z);
          normals.push(normal.x, normal.y, normal.z);

          triangles.push(vertex1.x, vertex1.y, vertex1.z);
          normals.push(normal.x, normal.y, normal.z);

          triangles.push(vertex2.x, vertex2.y, vertex2.z);
          normals.push(normal.x, normal.y, normal.z);
        }
      }
      this.setAttribute('position',
        new THREE.Float32BufferAttribute(triangles, 3));
	  	this.setAttribute('normal',
        new THREE.Float32BufferAttribute(normals, 3));
      this.setIndex(null);
    }
  }

  mergeVertices(vertexPrecision = 4)
  {
    const factor = Math.pow(10, vertexPrecision);

    let verticesMap = {};
    let unique = [], changes = [];

    let vertices = this.vertices;
    let faces = this.faces;

    for (let i = 0; i < vertices.length; i++)
    {
      let v = vertices[i];
      let key = Math.round(v.x * factor) + '_' +
        Math.round(v.y * factor) + '_' + Math.round(v.z * factor);

      if (verticesMap[key] === undefined)
      {
        verticesMap[key] = i;
        unique.push(vertices[i]);
        changes[i] = unique.length - 1;
      }
      else
      {
        changes[i] = changes[verticesMap[key]];
      }
    }

    let newFaces = [];

    for (let f = 0; f < this.faces.length; f++)
    {
      let face = faces[f];
      let indices = face.indices;
      let vertexCount = face.indices.length;
      for (let j = 0; j < vertexCount; j++)
      {
        indices[j] = changes[indices[j]];
      }

      let newIndices = [];
      for (let n = 0; n < vertexCount; n++)
      {
        if (indices[n] !== indices[(n + 1) % vertexCount])
        {
          newIndices.push(indices[n]);
        }
      }
      if (newIndices.length >= 3)
      {
        face.indices = newIndices;
        newFaces.push(face);
      }
    }

    this.vertices = unique;
    this.faces = newFaces;

    return this;
  }

  fixEdges(debug = false)
  {
    const vertexPrecision = 4;
    const vectorPrecision = 3;
    const distanceToEdge = 0.000001;
    const vector = new THREE.Vector3();
    const geometry = this;

    let isPointOnLine = function(pointA, pointB, pointToCheck, distance)
    {
      vector.crossVectors(pointA.clone().sub(pointToCheck),
        pointB.clone().sub(pointToCheck));
      return Math.abs(vector.length()) < distance;
    };

    let isPointOnSegment = function(pointA, pointB, pointToCheck, distance)
    {
      if (!isPointOnLine(pointA, pointB, pointToCheck, distance)) return false;

      let d = pointA.distanceTo(pointB);

      return pointA.distanceTo(pointToCheck) < d &&
          pointB.distanceTo(pointToCheck) < d;
    };

    let breakFace = function(face, edgeMap, vectorMap, vertices,
      faces, newFaces, distance)
    {
      let vertexCount = face.getVertexCount();

      for (let n = 0; n < vertexCount; n++)
      {
        let v1 = face.indices[n];
        let v2 = face.indices[(n + 1) % vertexCount];

        let p1 = vertices[v1];
        let p2 = vertices[v2];

        let edge = edgeMap.getEdge(v1, v2);
        if (edge.face2 === undefined)
        {
          let edgeVertices = vectorMap instanceof Array ?
            vectorMap : vectorMap.getEdgeVertices(p1, p2);

          for (let i = 0; i < edgeVertices.length; i++)
          {
            let v3 = edgeVertices[i];
            let p3 = vertices[v3];

            if (v1 !== v3 && v2 !== v3)
            {
              if (isPointOnSegment(p1, p2, p3, distance))
              {
                face.indices.splice(n + 1, 0, v3); // insert vertex v3
                faces.push(face); // push face again to split other edges

                edgeMap.removeEdge(v1, v2);
                edgeMap.addEdge(v1, v3, face);
                edgeMap.addEdge(v3, v2, face);

                return;
              }
            }
          }
        }
      }
      newFaces.push(face);
    };

    let breakFaces = function(edgeMap, vectorMap, vertices, faces, distance)
    {
      let newFaces = [];
      let steps = 0;
      while (faces.length > 0)
      {
        let face = faces.pop();
        breakFace(face, edgeMap, vectorMap, vertices, faces, newFaces,
          distance);
        steps++;
        if (steps > 100000)
        {
          console.error("infinite loop detected breaking edges");
          break;
        }
      }
      return newFaces;
    };

    this.mergeVertices(vertexPrecision);

    let vertices = this.vertices;
    let faces = this.faces;

    let edgeMap = new EdgeMap(this);
    if (debug) console.info("edgeMap", edgeMap);

    if (edgeMap.badEdgeCount > 0)
    {
      let badEdgeCount1 = edgeMap.badEdgeCount;
      let vectorMap = new VectorMap(edgeMap, vectorPrecision);
      if (debug) console.info("vectorMap", vectorMap);

      this.faces = breakFaces(edgeMap, vectorMap,
        vertices, faces, distanceToEdge);

      let badEdgeCount2 = edgeMap.badEdgeCount;

      if (edgeMap.badEdgeCount > 0 &&
          edgeMap.badEdgeCount < this.faces.length / 10 &&
          this.faces.length >= 12)
      {
        console.info("second pass " + this.uuid);

        let faces = this.faces;
        this.faces = breakFaces(edgeMap, edgeMap.getBadEdgeVertices(),
          vertices, faces, 0.01);

        let badEdgeCount3 = edgeMap.badEdgeCount;

        console.info(">>> " + badEdgeCount1, badEdgeCount2, badEdgeCount3);
      }
    }

    this.isManifold = edgeMap.badEdgeCount === 0;

    return edgeMap;
  }

  applyMatrix4(matrix)
  {
    for (var i = 0; i < this.vertices.length; i++)
    {
      this.vertices[i].applyMatrix4(matrix);
    }
    this.updateFaceNormals();
  }

  copy(geometry)
  {
    if (geometry instanceof SolidGeometry)
    {
      this.vertices = [];
      for (let v = 0; v < geometry.vertices.length; v++)
      {
        let vertex = geometry.vertices[v].clone();
        this.vertices.push(vertex);
      }
      for (let f = 0; f < geometry.faces.length; f++)
      {
        let face = geometry.faces[f];
        let newFace = new Face(this);
        newFace.indices = face.indices.slice();
        newFace.normal = face.normal ? face.normal.clone() : null;
        this.faces.push(newFace);
      }
      this.isManifold = geometry.isManifold;
    }
    else if (geometry instanceof THREE.BufferGeometry)
    {
      this.vertices = GeometryUtils.getBufferGeometryVertices(geometry);

      const addFace = (va, vb, vc) =>
      {
        this.addFace(va, vb, vc);
      };

      GeometryUtils.getBufferGeometryFaces(geometry, addFace);
      this.isManifold = false;
    }
  }

  clone()
  {
    var geometry = new SolidGeometry();
    geometry.copy(this);
    geometry.update();

    return geometry;
  }
}

/* Face */

class Face
{
  constructor(geometry) // SolidGeometry
  {
    this.geometry = geometry;
    this.indices = [];
    this.normal = null;
  }

  addVertex(vertex)
  {
    let vertexCount = this.geometry.vertices.length;
    if (typeof vertex === "number")
    {
      if (vertex >= 0 && vertex < vertexCount)
      {
        this.indices.push(vertex);
      }
      else console.warn("Invalid vertex index: " + vertex);
    }
    else if (vertex instanceof THREE.Vector3)
    {
      this.geometry.vertices.push(vertex);
      this.indices.push(vertexCount);
    }
  }

  getVertex(pos)
  {
    let index = this.indices[pos];
    return this.geometry.vertices[index];
  }

  getVertexCount()
  {
    return this.indices.length;
  }

  getVertices()
  {
    let vertices = [];
    for (let pos = 0; pos < this.indices.length; pos++)
    {
      vertices.push(this.getVertex(pos));
    }
    return vertices;
  }

  updateNormal()
  {
    if (this.indices.length >= 3)
    {
      let normal = new THREE.Vector3();
      let vertexCount = this.indices.length;
      let pi, pj;
      for (let i = 0; i < vertexCount; i++)
      {
        let j = (i + 1) % vertexCount;
        pi = this.getVertex(i);
        pj = this.getVertex(j);

        normal.x += (pi.y - pj.y) * (pi.z + pj.z);
        normal.y += (pi.z - pj.z) * (pi.x + pj.x);
        normal.z += (pi.x - pj.x) * (pi.y + pj.y);
      }
      normal.normalize();
      this.normal = normal;
    }
  }
}

/* EdgeMap */

class EdgeMap
{
  constructor(geometry) // SolidGeometry
  {
    this.geometry = geometry;
    this.edgeCount = 0;
    this.badEdgeCount = 0;
    this.build();
  }

  build()
  {
    this.map = {};

    const faces = this.geometry.faces;

    for (let f = 0; f < faces.length; f++)
    {
      let face = faces[f];
      let vertexCount = face.getVertexCount();

      for (let n = 0; n < vertexCount; n++)
      {
        let v1 = face.indices[n];
        let v2 = face.indices[(n + 1) % vertexCount];
        this.addEdge(v1, v2, face);
      }
    }
  }

  addEdge(v1, v2, face)
  {
    const key = this.getEdgeKey(v1, v2);

    let edge = this.map[key];
    if (edge === undefined)
    {
      edge = {
        index1: v1,
        index2: v2,
        face1: face,
        face2: undefined
      };
      this.map[key] = edge;
      this.edgeCount++;
      this.badEdgeCount++;
    }
    else if (edge.face2 === undefined)
    {
      edge.face2 = face;
      this.badEdgeCount--;
    }
  }

  removeEdge(v1, v2)
  {
    const key = this.getEdgeKey(v1, v2);

    let edge = this.map[key];
    if (edge)
    {
      if (edge.face2 === undefined)
      {
        this.badEdgeCount--;
      }
      this.edgeCount--;
      delete this.map[key];
    }
  }

  getEdge(v1, v2)
  {
    const key = this.getEdgeKey(v1, v2);

    return this.map[key];
  }

  getEdgeKey(v1, v2)
  {
    let index1 = Math.min(v1, v2);
    let index2 = Math.max(v1, v2);

    return index1 + ',' + index2;
  }

  getBadEdgeVertices()
  {
    let badEdgeVertices = new Set();
    for (let key in this.map)
    {
      let edge = this.map[key];

      if (edge.face2 === undefined)
      {
        badEdgeVertices.add(edge.index1);
        badEdgeVertices.add(edge.index2);
      }
    }
    let k = Array.from(badEdgeVertices);
    console.info("bad vertices", k);
    return k;
  }

  getEdgesGeometry(angle = 5)
  {
    const thresholdDot = Math.cos((Math.PI / 180) * angle);
    const vertices = this.geometry.vertices;
    const edgeVertices = [];

    for (let key in this.map)
    {
      let edge = this.map[key];

      if (edge.face2 === undefined ||
          edge.face1.normal.dot(edge.face2.normal) <= thresholdDot)
      {
        let vertex = vertices[edge.index1];
        edgeVertices.push(vertex.x, vertex.y, vertex.z);

        vertex = vertices[edge.index2];
        edgeVertices.push(vertex.x, vertex.y, vertex.z);
      }
    }

    const edgesGeometry = new THREE.BufferGeometry();
    edgesGeometry.setAttribute('position',
      new THREE.Float32BufferAttribute(edgeVertices, 3));

    return edgesGeometry;
  }
}

/* VectorMap */

class VectorMap
{
  constructor(edgeMap, vectorPrecision = 3)
  {
    this.edgeMap = edgeMap;
    this.vectorPrecision = vectorPrecision;
    this.build();
  }

  build()
  {
    this.map = {};

    const edgeMap = this.edgeMap;
    const vertices = edgeMap.geometry.vertices;

    for (let key in edgeMap.map)
    {
      let edge = edgeMap.map[key];

      if (edge.face2 === undefined)
      {
        let v1 = edge.index1;
        let v2 = edge.index2;
        let key = this.getVectorKey(vertices[v1], vertices[v2]);
        let list = this.map[key];
        if (list)
        {
          if (list.indexOf(v1) === -1)
          {
            list.push(v1);
          }
          if (list.indexOf(v2) === -1)
          {
            list.push(v2);
          }
        }
        else
        {
          this.map[key] = [v1, v2];
        }
      }
    }
  }

  getEdgeVertices(pointA, pointB)
  {
    const key = this.getVectorKey(pointA, pointB);
    return this.map[key] || [];
  }

  getVectorKey(vertex1, vertex2)
  {
    const factor = Math.pow(10, this.vectorPrecision);
    const vector = new THREE.Vector3();

    vector.copy(vertex2).sub(vertex1).normalize();
    var x = Math.round(vector.x * factor);
    var y = Math.round(vector.y * factor);
    var z = Math.round(vector.z * factor);

    var invert = false;
    if (x === 0)
    {
      if (y === 0)
      {
        if (z < 0)
        {
          invert = true;
        }
      }
      else if (y < 0)
      {
        invert = true;
      }
    }
    else if (x < 0)
    {
      invert = true;
    }
    if (invert)
    {
      x = -x;
      y = -y;
      z = -z;
    }
    return x + "," + y + "," + z;
  }
}

export { SolidGeometry, Face, EdgeMap, VectorMap };

