/*
 * SolidOptimizer.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";

class SolidOptimizer
{
  constructor(geometry)
  {
    this.inputGeometry = geometry;
    this.outputGeometry = new SolidGeometry();
    this.vertices = [];
    this.borderEdges = [];
    this.positionMap = new Map();
    this.edgeMap = new Map();
    this.vertexMap = new Map();
    this.vectorMap = new Map();
    this.polygons = new Set();
    this.statistics = { edges3Faces : 0, unmergedFaces : 0 };
    this.vertexFactor = 10000;
    this.vectorFactor = 1000;
    this.normalLimit = 0.999;
    this.vertexDistance = 0.0001;
    this.edgeDistance = 0.0001;
    this.minFaceArea = 0.00000001;
    this._vector = new THREE.Vector3();
  }

  optimize()
  {
    this.createPolygonsAndEdges();
    this.findBorderEdges();
    this.splitEdges();
    this.updateManifold();
    this.mergePolygons();
    this.createVertexMap();
    this.createFaces();

    return this.outputGeometry;
  }

  createPolygonsAndEdges()
  {
    const faces = this.inputGeometry.faces;
    const positionMap = this.positionMap;
    const edgeMap = this.edgeMap;
    const polygons = this.polygons;

    for (let f = 0; f < faces.length; f++)
    {
      let face = faces[f];
      if (face.getArea() > this.minFaceArea)
      {
        let faceEdges = [];
        this.processLoop(face.outerLoop, faceEdges);
        for (let hole of face.holes)
        {
          this.processLoop(hole, faceEdges);
        }

        if (faceEdges.length >= 3)
        {
          let polygon = new Polygon(f, face);
          polygons.add(polygon);

          for (let edge of faceEdges)
          {
            let edge2 = edgeMap.get(edge.key);
            if (edge2 === undefined) // new edge
            {
              edge.polygon1 = polygon;
              edgeMap.set(edge.key, edge);
            }
            else // edge already exists
            {
              if (edge2.polygon2 === null)
              {
                if (edge2.polygon1 === polygon)
                {
                  // unnecessary edge
                  edgeMap.delete(edge.key);
                }
                else
                {
                  edge2.polygon2 = polygon;
                }
              }
              else if (edge2.polygon2 === polygon)
              {
                edge2.polygon2 = null;
              }
              else
              {
                this.statistics.edges3Faces++;
              }
            }
          }
        }
      }
    }
  }

  processLoop(loop, faceEdges)
  {
    const inputVertices = this.inputGeometry.vertices;
    const indices = loop.indices;

    let v1 = null;

    for (let i = 0; i <= indices.length; i++)
    {
      let vertex = inputVertices[indices[i % indices.length]];
      let v2 = this.findVertex(vertex);

      if (v1 !== null && v1 !== v2)
      {
        faceEdges.push(new Edge(v1, v2));
      }
      v1 = v2;
    }
  };

  findVertex(vertex)
  {
    const factor = this.vertexFactor;
    const positionMap = this.positionMap;
    const vertices = this.vertices;

    let key = Math.round(vertex.x * factor) + '_' +
      Math.round(vertex.y * factor) + '_' + Math.round(vertex.z * factor);
    let v2 = positionMap[key];
    if (v2 === undefined)
    {
      v2 = this.findVertexHard(vertex);
      positionMap[key] = v2;
    }
    return v2;
  }

  findVertexHard(vertex)
  {
    const vertices = this.vertices;

    for (let i = 0; i < vertices.length; i++)
    {
      if (vertex.distanceTo(vertices[i]) < this.vertexDistance) return i;
    }

    let v = vertices.length;
    vertices.push(vertex);

    return v;
  }

  findBorderEdges()
  {
    const edgeMap = this.edgeMap;
    const borderEdges = this.borderEdges = [];

    for (let edge of edgeMap.values())
    {
      if (edge.polygon2 === null)
      {
        borderEdges.push(edge);
      }
    }
  }

  updateManifold()
  {
    const edgeMap = this.edgeMap;

    this.outputGeometry.isManifold = true;

    for (let edge of edgeMap.values())
    {
      if (edge.polygon2 === null)
      {
        this.outputGeometry.isManifold = false;
        break;
      }
    }
  }

  createVectorMap()
  {
    const vertices = this.vertices;
    const vectorMap = this.vectorMap;
    const borderEdges = this.borderEdges;

    for (let edge of borderEdges)
    {
      let point1 = vertices[edge.v1];
      let point2 = vertices[edge.v2];
      let key = this.getVectorKey(point1, point2);
      let vertexSet = vectorMap.get(key);
      if (vertexSet === undefined)
      {
        vertexSet = new Set();
        vectorMap.set(key, vertexSet);
      }
      vertexSet.add(edge.v1);
      vertexSet.add(edge.v2);
    }
  }

  splitEdges()
  {
    const borderEdges = this.borderEdges;
    if (borderEdges.length > 0)
    {
      this.createVectorMap();

      const vertices = this.vertices;
      const edgeMap = this.edgeMap;
      const edgeDistance = this.edgeDistance;
      const vectorMap = this.vectorMap;

      while (borderEdges.length > 0)
      {
        let edge = borderEdges.pop();
        if (edge.polygon2 === null) // may be already paired
        {
          let v1 = edge.v1;
          let v2 = edge.v2;
          let point1 = vertices[v1];
          let point2 = vertices[v2];
          let key = this.getVectorKey(point1, point2);
          let vertexSet = vectorMap.get(key);
          if (vertexSet)
          {
            for (let v3 of vertexSet.values())
            {
              let point3 = vertices[v3];
              if (v1 !== v3 && v2 !== v3 && GeometryUtils.isPointOnSegment(
                  point3, point1, point2, edgeDistance))
              {
                edgeMap.delete(edge.key);

                let edge13 = edgeMap.get(Edge.keyOf(v1, v3));
                if (edge13 === undefined) // new edge
                {
                  edge13 = new Edge(v1, v3);
                  edgeMap.set(edge13.key, edge13);
                  edge13.polygon1 = edge.polygon1;
                  borderEdges.push(edge13);
                }
                else if (edge13.polygon2 === null) // matching edge found
                {
                  edge13.polygon2 = edge.polygon1;
                }

                let edge32 = edgeMap.get(Edge.keyOf(v3, v2));
                if (edge32 === undefined) // new edge
                {
                  edge32 = new Edge(v3, v2);
                  edgeMap.set(edge32.key, edge32);
                  edge32.polygon1 = edge.polygon1;
                  borderEdges.push(edge32);
                }
                else if (edge32.polygon2 === null) // matching edge found
                {
                  edge32.polygon2 = edge.polygon1;
                }

                vertexSet.delete(v3);
                break;
              }
            }
          }
        }
      }
    }
  }

  mergePolygons()
  {
    const edgeMap = this.edgeMap;
    const polygons = this.polygons;
    const limit = this.normalLimit;
    const vertices = this.vertices;

    for (let edge of edgeMap.values())
    {
      edge.polygon1.edges.push(edge);
      if (edge.polygon2) edge.polygon2.edges.push(edge);
    }

    for (let edge of edgeMap.values())
    {
      if (edge.polygon2 !== null && edge.polygon1 !== edge.polygon2)
      {
        if (Math.abs(edge.polygon1.normal.dot(edge.polygon2.normal)) > limit)
        {
          let oldPolygon = edge.polygon2;
          edge.polygon1.merge(edge.polygon2);
          polygons.delete(oldPolygon);
        }
      }
    }
  }

  createVertexMap()
  {
    const edgeMap = this.edgeMap;
    const vertexMap = this.vertexMap;
    const vertices = this.vertices;

    const addVertex = (edge, v) =>
    {
      let vertex = vertexMap.get(v);
      if (vertex === undefined)
      {
        vertex = new Vertex(vertices[v]);
        vertexMap.set(v, vertex);
      }
      vertex.polygons.add(edge.polygon1);
      if (edge.polygon2 === null)
      {
        vertex.onBorder = true;
      }
      else
      {
        vertex.polygons.add(edge.polygon2);
      }
    };

    for (let edge of edgeMap.values())
    {
      let v1 = edge.v1;
      let v2 = edge.v2;
      addVertex(edge, v1);
      addVertex(edge, v2);
    }
  }

  createFaces()
  {
    const polygons = this.polygons;

    for (let polygon of polygons)
    {
      this.createFace(polygon);
    }
    this.outputGeometry.updateBuffers();
  }

  createFace(polygon)
  {
    const outputGeometry = this.outputGeometry;
    const vertices = outputGeometry.vertices;
    const vertexMap = this.vertexMap;
    const edgeMap = this.edgeMap;
    const segments = new Map();
    let rings = [];

    // create segments Map
    for (let edge of polygon.edges)
    {
      if (edge.polygon2 === null ||
          edge.polygon1 !== edge.polygon2)
      {
        let v1 = edge.v1;
        let v2 = edge.v2;

        let next1 = segments.get(v1);
        if (next1 === undefined)
        {
          next1 = [];
          segments.set(v1, next1);
        }
        next1.push(v2);

        let next2 = segments.get(v2);
        if (next2 === undefined)
        {
          next2 = [];
          segments.set(v2, next2);
        }
        next2.push(v1);
      }
      else edgeMap.delete(edge.key);
    }

    // find rings
    while (segments.size > 0)
    {
      let ring = [];

      let v0 = segments.keys().next().value;
      let v1 = null;
      let v2 = v0;
      let next = undefined;

      do
      {
        let vertex = vertexMap.get(v2);

        if (vertex && (vertex.polygons.size >= 3 || vertex.onBorder))
        {
          if (vertex.newIndex === undefined)
          {
            vertex.newIndex = vertices.length;
            vertices.push(vertex.position);
          }
          ring.push(vertex.newIndex);
        }

        next = segments.get(v2);
        if (next)
        {
          segments.delete(v2);
          let vn = next[0] === v1 ? next[1] : next[0];
          v1 = v2;
          v2 = vn;
        }
      }
      while (next !== undefined && v2 !== v0);

      if (next === undefined || ring.length < 3)
      {
        // invalid ring
        rings  = [];
        break;
      }
      else
      {
        // have a valid ring
        rings.push(ring);
      }
    }

    if (rings.length > 0)
    {
      // create faces from rings

      let o = rings.length === 1 ?
        0 : this.findOuterRing(rings, vertices, polygon.normal);

      let outerRing = rings[o];

      for (let ring of rings)
      {
        if (ring === outerRing)
        {
          this.orientRing(ring, vertices, polygon.normal, false);
        }
        else
        {
          this.orientRing(ring, vertices, polygon.normal, true);
        }
      }

      let face = outputGeometry.addFace(...outerRing);
      face.normal = polygon.normal;

      for (let r = 0; r < rings.length; r++)
      {
        if (r !== o)
        {
          face.addHole(...rings[r]);
        }
      }
    }
    else
    {
      // invalid rings, add original faces

      const inputVertices = this.inputGeometry.vertices;
      for (let originalFace of polygon.faces)
      {
        let points = originalFace.indices.map(v => inputVertices[v]);
        let face = outputGeometry.addFace(...points);
        face.normal = polygon.normal;

        for (let hole of face.holes)
        {
          points = hole.indices.map(v => inputVertices[v]);
          face.addHole(...points);
        }
      }
      this.statistics.unmergedFaces++;
      outputGeometry.isManifold = false;
    }
  }

  findOuterRing(rings, vertices, normal)
  {
    let max = -Infinity;
    let rMax = 0;
    let dim = "x";
    if (Math.abs(normal.x) > 0.9)
    {
      dim = "y";
      if (Math.abs(normal.y) > 0.9)
      {
        dim = "z";
      }
    }

    for (let r = 0; r < rings.length; r++)
    {
      let ring = rings[r];
      for (let v of ring)
      {
        let vertex = vertices[v];
        if (vertex[dim] > max)
        {
          max = vertex[dim];
          rMax = r;
        }
      }
    }
    return rMax;
  }

  orientRing(ring, vertices, normal, isHole)
  {
    let ringNormal = this._vector;
    GeometryUtils.calculateNormal(ring, v => vertices[v], ringNormal);
    let dot = ringNormal.dot(normal);
    if (!isHole && dot < 0 || isHole && dot > 0)
    {
      ring.reverse();
    }
  }

  getVectorKey(vertex1, vertex2)
  {
    const factor = this.vectorFactor;
    const vector = this._vector;

    vector.copy(vertex2).sub(vertex1).normalize();
    let x = Math.round(vector.x * factor);
    let y = Math.round(vector.y * factor);
    let z = Math.round(vector.z * factor);

    let invert = false;
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

class Vertex
{
  constructor(position)
  {
    this.position = position;
    this.polygons = new Set();
    this.newIndex = undefined;
    this.onBorder = false;
  }
}

class Edge
{
  constructor(v1, v2)
  {
    this.v1 = Math.min(v1, v2);
    this.v2 = Math.max(v1, v2);
    this.polygon1 = null;
    this.polygon2 = null;
  }

  get key()
  {
    return Edge.keyOf(this.v1, this.v2);
  }

  static keyOf(v1, v2)
  {
    return Math.min(v1, v2) + "=>" + Math.max(v1, v2);
  }
}

class Polygon
{
  constructor(id, face)
  {
    this.id = id;
    this.normal = face.normal.clone();
    this.faces = [face];
    this.edges = [];
  }

  merge(polygon)
  {
    for (let edge of polygon.edges)
    {
      if (edge.polygon1 === polygon) edge.polygon1 = this;
      else if (edge.polygon2 === polygon) edge.polygon2 = this;
    }
    this.edges.push(...polygon.edges);
    this.faces.push(...polygon.faces);
    polygon.edges = [];
    polygon.faces = [];
  }
}

export { SolidOptimizer };