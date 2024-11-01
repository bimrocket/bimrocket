/*
 * GeometryMerger.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { SolidBuilder } from "./SolidBuilder.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "three";

class GeometryMerger extends ObjectBuilder
{
  static MESHES_NAME = "merged_meshes";
  static LINES_NAME = "merged_lines";

  constructor()
  {
    super();
    this._triangle =
      [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this._vector = new THREE.Vector3();
    this._material = null;
  }

  performBuild(object)
  {
    const triangles = [];
    const normals = [];
    const edges = [];
    const matrix = new THREE.Matrix4();

    let mesh = object.getObjectByName(GeometryMerger.MESHES_NAME);
    if (mesh)
    {
      mesh.geometry.dispose();
      object.remove(mesh);
    }

    let lines = object.getObjectByName(GeometryMerger.LINES_NAME);
    if (lines)
    {
      lines.geometry.dispose();
      object.remove(lines);
    }

    for (let child of object.children)
    {
      this.collectGeometry(child, matrix, triangles, normals, edges);
      child.visible = false;
    }

    /* meshes */
    const meshGeometry = new THREE.BufferGeometry();

    meshGeometry.setAttribute('position',
      new THREE.Float32BufferAttribute(triangles, 3));
	  meshGeometry.setAttribute('normal',
      new THREE.Float32BufferAttribute(normals, 3));

    mesh = new THREE.Mesh(meshGeometry, this._material);
    mesh.name = GeometryMerger.MESHES_NAME;
    mesh.raycast = function(){};
    ObjectUtils.setSelectionHighlight(mesh, ObjectUtils.HIGHLIGHT_NONE);

    object.add(mesh);

    /* lines */
    const linesGeometry = new THREE.BufferGeometry();

    linesGeometry.setAttribute('position',
      new THREE.Float32BufferAttribute(edges, 3));

    lines = new THREE.LineSegments(linesGeometry, Solid.EdgeMaterial);
    lines.name = GeometryMerger.LINES_NAME;
    lines.raycast = function(){};
    ObjectUtils.setSelectionHighlight(lines, ObjectUtils.HIGHLIGHT_NONE);

    object.add(lines);

    return true;
  }

  copy(source)
  {
    return this;
  }

  collectGeometry(object, baseMatrix, triangles, normals, edges)
  {
    const triangle = this._triangle;
    const normal = this._vector;
    const vector = this._vector;
    const matrix = new THREE.Matrix4();
    matrix.copy(baseMatrix);
    matrix.multiply(object.matrix);

    if (object instanceof Solid)
    {
      const solid = object;

      if (solid.facesVisible && solid.geometry && solid.geometry.faces)
      {
        const vertices = solid.geometry.vertices;
        for (let face of solid.geometry.faces)
        {
          let faceTriangles = face.getTriangles();
          for (let t of faceTriangles)
          {
            for (let i = 0; i < 3; i++)
            {
              triangle[i].copy(vertices[t[i]]).applyMatrix4(matrix);
            }

            GeometryUtils.calculateNormal(triangle, undefined, normal);

            for (let i = 0; i < 3; i++)
            {
              triangles.push(triangle[i].x, triangle[i].y, triangle[i].z);
              normals.push(normal.x, normal.y, normal.z);
            }
          }
        }
      }

      if (solid.edgesVisible && solid.edgesGeometry.attributes?.position)
      {
        const array = solid.edgesGeometry.attributes.position.array;
        for (let i = 0; i < array.length; i += 3)
        {
          vector.set(array[i], array[i + 1], array[i + 2]);
          vector.applyMatrix4(matrix);
          edges.push(vector.x, vector.y, vector.z);
        }
      }

      if (this._material === null)
      {
        this._material = solid.material;
      }
    }
    else if (object instanceof Profile)
    {

    }
    else if (object instanceof Cord)
    {

    }
    else
    {
      for (let child of object.children)
      {
        this.collectGeometry(child, matrix, triangles, normals, edges);
      }
    }
  }
}

ObjectBuilder.addClass(GeometryMerger);

export { GeometryMerger };

