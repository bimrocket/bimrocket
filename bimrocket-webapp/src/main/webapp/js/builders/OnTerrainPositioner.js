/*
 * OnTerrainPositioner.js
 *
 * @author realor
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import { ElevationMap } from "../utils/ElevationMap.js";
import * as THREE from "three";

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

    elevationMap.updateTerrainMatrix();

    const vertex = new THREE.Vector3();
    vertex.applyMatrix4(object.matrixWorld);

    const x = vertex.x;
    const y = vertex.y;
    let z = elevationMap.getElevation(x, y);
    if (z === -Infinity) z = 0;

    vertex.z = z;
    vertex.applyMatrix4(object.parent.matrixWorld.clone().invert());

    object.position.z = vertex.z + this.offset;
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