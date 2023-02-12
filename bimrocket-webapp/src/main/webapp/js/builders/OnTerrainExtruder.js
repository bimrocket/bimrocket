/*
 * OnTerrainExtruder.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { SweptSolidBuilder } from "./SweptSolidBuilder.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { ElevationMap } from "../utils/ElevationMap.js";
import * as THREE from "../lib/three.module.js";

class OnTerrainExtruder extends SweptSolidBuilder
{
  terrainObject = null;
  depth = 1;
  flatProfile = true;

  constructor(terrainObject, depth, flatProfile)
  {
    super();
    if (terrainObject instanceof THREE.Object3D)
    {
      this.terrainObject = terrainObject;
    }
    if (typeof depth === "number")
    {
      this.depth = depth;
    }
    if (typeof flatProfile === "boolean")
    {
      this.flatProfile = flatProfile;
    }
  }

  traverseDependencies(object, action)
  {
    if (this.terrainObject)
    {
      action(this.terrainObject);
    }

    // traverse children skiping faces & edges objects
    const children = object.children;
    for (let i = 2; i < children.length; i++)
    {
      let child = children[i];
      action(child);
    }
  }

  performBuild(solid)
  {
    let profile = this.findClosedProfile(solid);
    if (profile === undefined) return true;

    profile.updateMatrix();

    let [ outerRing, innerRings, stepVertexCount ] = this.prepareRings(profile);

    const elevationMap = ElevationMap.getInstance(this.terrainObject);
    if (elevationMap === null) return true;

    if (this.flatProfile)
    {
      let minZ = Infinity;
      let vertex = new THREE.Vector3();
      for (let point of outerRing)
      {
        vertex.set(point.x, point.y, 0).applyMatrix4(profile.matrixWorld);
        let z = elevationMap.getElevation(vertex.x, vertex.y);
        if (z > -Infinity && z < minZ) minZ = z;
      }
      if (minZ === Infinity) minZ = 0;

      let geometry = new SolidGeometry();
      let matrix = new THREE.Matrix4();

      this.addStepVertices(outerRing, innerRings, matrix, geometry);

      matrix.makeTranslation(0, 0, this.depth);

      this.addStepVertices(outerRing, innerRings, matrix, geometry);

      this.addProfileFace(0, outerRing, innerRings, true, geometry);

      this.addLateralFaces(0, stepVertexCount, outerRing, innerRings,
        false, geometry);

      this.addProfileFace(stepVertexCount, outerRing, innerRings,
        false, geometry);

      geometry.isManifold = true;

      solid.updateGeometry(geometry);
      solid.position.z = minZ;
      solid.updateMatrix();
    }
    else
    {
      let verticesBottom = [];
      let verticesTop = [];

      let minZ = Infinity;
      for (let point of outerRing)
      {
        let vertex = new THREE.Vector3();
        vertex.set(point.x, point.y, 0).applyMatrix4(profile.matrixWorld);
        let z = elevationMap.getElevation(vertex.x, vertex.y);
        if (z > -Infinity && z < minZ) minZ = z;
        vertex.z = z;
        verticesBottom.push(vertex);
      }
      for (let vertex of verticesBottom)
      {
        if (vertex.z === -Infinity) vertex.z = minZ;

        let vertexTop = vertex.clone();
        vertexTop.z += this.depth;
        verticesTop.push(vertexTop);
      }

      for (let innerRing of innerRings)
      {
        for (let point of innerRing)
        {
          let vertex = new THREE.Vector3();
          vertex.set(point.x, point.y, 0).applyMatrix4(profile.matrixWorld);
          vertex.z = elevationMap.getElevation(vertex.x, vertex.y);
          if (vertex.z === -Infinity) vertex.z = minZ;
          verticesBottom.push(vertex);

          let vertexTop = vertex.clone();
          vertexTop.z += this.depth;
          verticesTop.push(vertexTop);
        }
      }

      let triangles = THREE.ShapeUtils.triangulateShape(outerRing, innerRings);

      let geometry = new SolidGeometry();

      // add bottom face
      geometry.vertices.push(...verticesBottom);
      for (let triangle of triangles)
      {
        let v0 = triangle[0];
        let v1 = triangle[1];
        let v2 = triangle[2];
        geometry.addFace(v2, v1, v0);
      }

      // add top face
      geometry.vertices.push(...verticesTop);
      for (let triangle of triangles)
      {
        let v0 = verticesBottom.length + triangle[0];
        let v1 = verticesBottom.length + triangle[1];
        let v2 = verticesBottom.length + triangle[2];
        geometry.addFace(v0, v1, v2);
      }

      this.addLateralFaces(0, verticesBottom.length, outerRing, innerRings,
        false, geometry);

      solid.position.set(0, 0, 0);
      solid.updateGeometry(geometry);
      solid.updateMatrix();
    }
    return true;
  }

  copy(source)
  {
    this.terrainObject = source.terrainObject;
    this.depth = source.depth;
    this.flatProfile = source.flatProfile;
    this.minPointDistance = source.minPointDistance;

    return this;
  }
}

ObjectBuilder.addClass(OnTerrainExtruder);

export { OnTerrainExtruder };