/*
 * SolidGeometry.js
 *
 * @author realor
 */

import * as THREE from "three";
import { GeometryUtils } from "../utils/GeometryUtils.js";

class SolidGeometry extends THREE.BufferGeometry
{
  constructor()
  {
    super();
    this.type = "SolidGeometry";
    this.vertices = []; // THREE.Vector3
    this.faces = []; // Face
    this.isManifold = false;
    this.smoothAngle = 0;
  }

  addFace(...vertices)
  {
    if (vertices.length < 3)
    {
      throw "Invalid face: " + vertices.length + " vertices";
    }

    const face = new Face(this);
    const outerLoop = face.outerLoop;
    for (let v of vertices)
    {
      outerLoop._addVertex(v);
    }
    face.updateNormal();
    this.faces.push(face);
    this.boundingBox = null;
    this.boundingSphere = null;

    return face;
  }

  updateFaceNormals()
  {
    for (let face of this.faces)
    {
      face.updateNormal();
    }
  }

  updateBuffers()
  {
    const positions = [];
    const normals = [];
    const vertices = this.vertices;

    if (this.smoothAngle > 0)
    {
      const cosAngle = Math.cos(THREE.MathUtils.degToRad(this.smoothAngle));
      const vertexMap = new Map();

      const processLoopEdges = loop =>
      {
        const face = loop.face;
        for (let v of loop.indices)
        {
          let vertexFaceMap = vertexMap.get(v);
          if (vertexFaceMap === undefined)
          {
            vertexFaceMap = new Map();
            vertexMap.set(v, vertexFaceMap);
          }
          let normals = null;
          for (let otherFace of vertexFaceMap.keys())
          {
            if (otherFace.normal.dot(face.normal) > cosAngle)
            {
              normals = vertexFaceMap.get(otherFace);
              break;
            }
          }
          if (normals === null) normals = [];
          normals.push(face.normal);
          vertexFaceMap.set(face, normals);
        }
      };

      for (let face of this.faces)
      {
        if (face.normal === null) face.updateNormal();

        processLoopEdges(face.outerLoop);

        for (let hole of face.holes)
        {
          processLoopEdges(hole);
        }
      }

      for (let vertexFaceMap of vertexMap.values())
      {
        for (let face of vertexFaceMap.keys())
        {
          let smoothNormal = null;
          let normals = vertexFaceMap.get(face);
          if (normals.length === 1)
          {
            smoothNormal = normals[0];
          }
          else
          {
            smoothNormal = new THREE.Vector3();
            for (let normal of normals)
            {
              smoothNormal.add(normal);
            }
            smoothNormal.normalize();
          }
          vertexFaceMap.set(face, smoothNormal);
        }
      }

      for (let face of this.faces)
      {
        let triangles = face.getTriangles();
        for (let triangle of triangles)
        {
          for (let i = 0; i < 3; i++)
          {
            let v = triangle[i];

            let vertex = vertices[v];
            let normal = vertexMap.get(v).get(face);

            positions.push(vertex.x, vertex.y, vertex.z);
            normals.push(normal.x, normal.y, normal.z);
          }
        }
      }
    }
    else
    {
      for (let face of this.faces)
      {
        if (face.normal === null) face.updateNormal();
        let normal = face.normal;
        let triangles = face.getTriangles();
        for (let triangle of triangles)
        {
          for (let i = 0; i < 3; i++)
          {
            let vertex = vertices[triangle[i]];
            positions.push(vertex.x, vertex.y, vertex.z);
            normals.push(normal.x, normal.y, normal.z);
          }
        }
      }
    }
    this.setAttribute('position',
      new THREE.Float32BufferAttribute(positions, 3));
    this.setAttribute('normal',
      new THREE.Float32BufferAttribute(normals, 3));
    this.setIndex(null);

    return this;
  }

  applyMatrix4(matrix)
  {
    for (let vertex of this.vertices)
    {
      vertex.applyMatrix4(matrix);
    }
    this.updateFaceNormals();
    this.updateBuffers();

    if (this.boundingBox !== null)
    {
      this.computeBoundingBox();
    }

    if (this.boundingSphere !== null)
    {
      this.computeBoundingSphere();
    }
    return this;
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
      this.faces = [];
      for (let f = 0; f < geometry.faces.length; f++)
      {
        let face = geometry.faces[f];
        let newFace = new Face(this);
        newFace.indices = [...face.indices];
        newFace.normal = face.normal ? face.normal.clone() : null;
        for (let hole of face.holes)
        {
          let newHole = new Loop(newFace);
          newHole.indices = [...hole.indices];
          newFace.holes.push(newHole);
        }
        this.faces.push(newFace);
      }
      this.isManifold = geometry.isManifold;
      this.smoothAngle = geometry.smoothAngle;
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
      this.smoothAngle = 0;
    }
    return this;
  }

  clone()
  {
    const geometry = new SolidGeometry();
    geometry.copy(this);
    geometry.updateBuffers();

    return geometry;
  }

  getEdgesGeometry()
  {
    const edges = new Set();
    let edgePositions = [];
    for (let face of this.faces)
    {
      face.outerLoop.forEachEdge((v1, v2, position1, position2) =>
      {
        let key = Math.min(v1, v2) + "/" + Math.max(v1, v2);
        if (!edges.has(key))
        {
          edgePositions.push(position1, position2);
          edges.add(key);
        }
      });

      for (let hole of face.holes)
      {
        hole.forEachEdge((v1, v2, position1, position2) =>
        {
          let key = Math.min(v1, v2) + "/" + Math.max(v1, v2);
          if (!edges.has(key))
          {
            edgePositions.push(position1, position2);
            edges.add(key);
          }
        });
      }
    }

    let edgesGeometry = new THREE.BufferGeometry();
    edgesGeometry.setFromPoints(edgePositions);

    return edgesGeometry;
  }

  getTriangleCount()
  {
    let triangleCount = 0;
    for (let face of this.faces)
    {
      triangleCount += face.getTriangles().length;
    }
    return triangleCount;
  }

  getTrianglesGeometry()
  {
    const edges = new Set();
    const vertices = this.vertices;
    let edgePositions = [];
    for (let face of this.faces)
    {
      let triangles = face.getTriangles();
      for (let triangle of triangles)
      {
        for (let i = 0; i < 3; i++)
        {
          let v1 = triangle[i];
          let v2 = triangle[(i + 1) % 3];
          let key = Math.min(v1, v2) + "/" + Math.max(v1, v2);
          if (!edges.has(key))
          {
            edgePositions.push(vertices[v1], vertices[v2]);
            edges.add(key);
          }
        }
      }
    }

    let trianglesGeometry = new THREE.BufferGeometry();
    trianglesGeometry.setFromPoints(edgePositions);

    return trianglesGeometry;
  }

  getBoundingBox()
  {
    if (!this.boundingBox)
    {
      this.computeBoundingBox();
    }
    return this.boundingBox;
  }

  getBoundingSphere()
  {
    if (!this.boundingSphere)
    {
      this.computeBoundingSphere();
    }
    return this.boundingSphere;
  }
}


/* Face */

class Face
{
  constructor(geometry) // SolidGeometry
  {
    this.geometry = geometry;
    this.outerLoop = new Loop(this);
    this.holes = []; // array of Loop
    this.normal = null;
    this.triangles = null;
  }

  getVertex(pos)
  {
    return this.outerLoop.getVertex(pos);
  }

  getVertexCount()
  {
    return this.outerLoop.indices.length;
  }

  getVertices()
  {
    return this.outerLoop.getVertices();
  }

  get indices()
  {
    return this.outerLoop.indices;
  }

  set indices(indices)
  {
    this.outerLoop.indices = indices;
  }

  addHole(...vertices)
  {
    if (vertices.length < 3)
    {
      throw "Invalid hole: " + vertices.length + " vertices";
    }

    const hole = new Loop(this);
    for (let v of vertices)
    {
      hole._addVertex(v);
    }
    this.holes.push(hole);
    this.triangles = null;

    return hole;
  }

  getHole(index)
  {
    return this.holes[index];
  }

  get holeCount()
  {
    return this.holes.length;
  }

  updateNormal()
  {
    const indices = this.indices;
    if (indices.length >= 3)
    {
      let normal = new THREE.Vector3();
      let vertexCount = indices.length;
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

  getTriangles()
  {
    if (this.triangles === null)
    {
      this.updateTriangles();
    }
    return this.triangles;
  }

  isConvex()
  {
    let v12 = new THREE.Vector3();
    let v13 = new THREE.Vector3();
    if (this.normal === null)
    {
      this.updateNormal();
    }

    const indices = this.outerLoop.indices;
    const vertices = this.geometry.vertices;
    if (indices.length === 3) return true;
    for (let i = 0; i < indices.length; i++)
    {
      let v1 = indices[i];
      let v2 = indices[(i + 1) % indices.length];
      let v3 = indices[(i + 2) % indices.length];
      let vertex1 = vertices[v1];
      let vertex2 = vertices[v2];
      let vertex3 = vertices[v3];
      v12.subVectors(vertex2, vertex1);
      v13.subVectors(vertex3, vertex1);
      if (v12.cross(v13).dot(this.normal) < 0) return false;
    }
    return true;
  }

  getArea()
  {
    let area = 0;
    const triangle = new THREE.Triangle();

    const vertices = this.geometry.vertices;
    let triangles = this.getTriangles();
    for (let tri of triangles)
    {
      let vertex0 = vertices[tri[0]];
      let vertex1 = vertices[tri[1]];
      let vertex2 = vertices[tri[2]];

      triangle.a.copy(vertex0);
      triangle.b.copy(vertex1);
      triangle.c.copy(vertex2);
      area += triangle.getArea();
    }
    return area;
  }

  updateTriangles()
  {
    if (this.indices.length === 3 && this.holes.length === 0)
    {
      let a = this.indices[0];
      let b = this.indices[1];
      let c = this.indices[2];
      this.triangles = [[a, b, c]];
    }
    else
    {
      const vertices = this.geometry.vertices;
      const faceIndices = [];

      const outerVertices = this.indices.map(v => vertices[v]);
      faceIndices.push(...this.indices);

      const innerVertices = [];
      for (let hole of this.holes)
      {
        innerVertices.push(hole.indices.map(v => vertices[v]));
        faceIndices.push(...hole.indices);
      }

      this.triangles = GeometryUtils.triangulateFace(
        outerVertices, innerVertices, this.normal);
      for (let triangle of this.triangles)
      {
        for (let i = 0; i < 3; i++)
        {
          triangle[i] = faceIndices[triangle[i]];
        }
      }
    }
  }
}

/* Loop */

class Loop
{
  constructor(face)
  {
    this.face = face;
    this.indices = [];
  }

  getVertex(pos)
  {
    const vertices = this.face.geometry.vertices;
    let index = this.indices[pos];
    return vertices[index];
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

  forEachEdge(fn) // fn(v1, v2, position1, position2)
  {
    let vertices = this.face.geometry.vertices;
    for (let i = 0; i < this.indices.length; i++)
    {
      let v1 = this.indices[i];
      let v2 = this.indices[(i + 1) % this.indices.length];
      let position1 = vertices[v1];
      let position2 = vertices[v2];
      fn(v1, v2, position1, position2);
    }
  }

  _addVertex(vertex)
  {
    const vertices = this.face.geometry.vertices;
    let vertexCount = vertices.length;
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
      vertices.push(vertex);
      this.indices.push(vertexCount);
    }
    this.face.triangles = null;

    return vertexCount;
  }
}

export { SolidGeometry, Face, Loop };

