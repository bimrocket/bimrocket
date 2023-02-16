/*
 * OnTerrainPositioner.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ElevationMap } from "../utils/ElevationMap.js";
import * as THREE from "../lib/three.module.js";

class OnTerrainPositioner extends ObjectBuilder
{
  terrainObject = null;
  offset = 0;

  constructor(terrainObject, offset)
  {
    super();
    if (terrainObject instanceof THREE.Object3D)
    {
      this.terrainObject = terrainObject;
    }
    if (typeof offset === "number")
    {
      this.offset = offset;
    }
  }

  traverseDependencies(object, action)
  {
    super.traverseDependencies(object, action);

    if (this.terrainObject)
    {
      action(this.terrainObject);
    }
  }

  performBuild(object)
  {
    const elevationMap = ElevationMap.getInstance(this.terrainObject);
    if (elevationMap === null) return true;

    const positionWorld = new THREE.Vector3();
    positionWorld.copy(object.position).applyMatrix4(object.parent.matrixWorld);

    const x = positionWorld.x;
    const y = positionWorld.y;
    let z = elevationMap.getElevation(x, y);
    if (z === -Infinity) z = 0;
    z += this.offset;
    positionWorld.z = z;

    const inverseMatrixWorld = new THREE.Matrix4();
    inverseMatrixWorld.copy(object.parent.matrixWorld).invert();

    object.position.copy(positionWorld).applyMatrix4(inverseMatrixWorld);
    object.updateMatrix();

    return true;
  }

  copy(source)
  {
    this.terrainObject = source.terrainObject;
    this.offset = source.offset;

    return this;
  }
}

ObjectBuilder.addClass(OnTerrainPositioner);

export { OnTerrainPositioner };