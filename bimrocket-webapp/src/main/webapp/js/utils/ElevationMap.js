/**
 * ElevationMap.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class ElevationMap
{
  static ELEVATION_MAP = "_elevationMap";

  constructor(terrainObject, tileSize = 5)
  {
    this.terrainObject = terrainObject;
    this.map = new Map();
    this.tileSize = tileSize;
    this.create();
  }

  static getInstance(terrainObject)
  {
    let elevationMap = null;

    if (terrainObject instanceof THREE.Object3D)
    {
      elevationMap = terrainObject[this.ELEVATION_MAP];
      if (!(elevationMap instanceof ElevationMap))
      {
        elevationMap = new ElevationMap(terrainObject);
        terrainObject[this.ELEVATION_MAP] = elevationMap;
      }
    }
    return elevationMap;
  }

  create()
  {
    console.info("Creating elevation map for " + this.terrainObject.name + ".");
    let t0 = Date.now();

    this.map.clear();

    if (this.terrainObject instanceof THREE.Object3D)
    {
      this.terrainObject.traverse(object =>
      {
        if (object.visible && object instanceof THREE.Mesh &&
            object.geometry instanceof THREE.BufferGeometry)
        {
          this.processMesh(object);
        }
      });
    }
    let t1 = Date.now();
    let ellapsed = t1 - t0;
    console.info(`Elevation map created in ${ellapsed} ms.`);
  }

  processMesh(mesh)
  {
    const indexAttribute = mesh.geometry.getIndex();
    if (indexAttribute)
    {
      const indexArray = indexAttribute.array;
      const triangleCount = indexArray.length / 3;

      const pointA = new THREE.Vector3();
      const pointB = new THREE.Vector3();
      const pointC = new THREE.Vector3();

      for (let ti = 0; ti < triangleCount; ti++)
      {
        if (this.getTriangleVertices(mesh, ti, pointA, pointB, pointC))
        {
          this.processTriangle(mesh, ti, pointA, pointB, pointC);
        }
      }
    }
  }

  processTriangle(mesh, ti, pointA, pointB, pointC)
  {
    const tax = Math.floor(pointA.x / this.tileSize);
    const tay = Math.floor(pointA.y / this.tileSize);

    const tbx = Math.floor(pointB.x / this.tileSize);
    const tby = Math.floor(pointB.y / this.tileSize);

    const tcx = Math.floor(pointC.x / this.tileSize);
    const tcy = Math.floor(pointC.y / this.tileSize);

    let txMin = Math.min(tax, Math.min(tbx, tcx));
    let tyMin = Math.min(tay, Math.min(tby, tcy));

    let txMax = Math.max(tax, Math.max(tbx, tcx));
    let tyMax = Math.max(tay, Math.max(tby, tcy));

    for (let i = txMin; i <= txMax; i++)
    {
      for (let j = tyMin; j <= tyMax; j++)
      {
        this.putTriangle(mesh, ti, i, j);
      }
    }
  }

  putTriangle(mesh, ti, tx, ty)
  {
    const key = tx + "/" + ty;
    let array = this.map.get(key);
    if (array)
    {
      for (let item of array)
      {
        if (item[0] === mesh && item[1] === ti) return;
      }
      array.push([mesh, ti]);
    }
    else
    {
      array = [[mesh, ti]];
      this.map.set(key, array);
    }
  }

  getTriangleVertices(mesh, ti, pointA, pointB, pointC)
  {
    const geometry = mesh.geometry;
    const matrixWorld = mesh.matrixWorld;
    const positionAttribute = geometry.getAttribute("position");
    const indexAttribute = geometry.getIndex();
    if (positionAttribute && indexAttribute)
    {
      const positionArray = positionAttribute.array;
      const itemSize = positionAttribute.itemSize;
      const indexArray = indexAttribute.array;
      const triangleCount = indexArray.length / 3;

      let v0 = indexArray[3 * ti];
      let v1 = indexArray[3 * ti + 1];
      let v2 = indexArray[3 * ti + 2];

      pointA.set(positionArray[itemSize * v0],
        positionArray[itemSize * v0 + 1],
        positionArray[itemSize * v0 + 2]);
      pointA.applyMatrix4(matrixWorld);

      pointB.set(positionArray[itemSize * v1],
        positionArray[itemSize * v1 + 1],
        positionArray[itemSize * v1 + 2]);
      pointB.applyMatrix4(matrixWorld);

      pointC.set(positionArray[itemSize * v2],
        positionArray[itemSize * v2 + 1],
        positionArray[itemSize * v2 + 2]);
      pointC.applyMatrix4(matrixWorld);
      return true;
    }
    return false;
  }

  getElevation(x, y)
  {
    const origin = new THREE.Vector3(x, y, 10000);
    const direction = new THREE.Vector3(0, 0, -1);
    const ray = new THREE.Ray(origin, direction);

    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    const key = tx + "/" + ty;
    let array = this.map.get(key);
    if (array)
    {
      const pointA = new THREE.Vector3();
      const pointB = new THREE.Vector3();
      const pointC = new THREE.Vector3();
      const target = new THREE.Vector3();

      for (let item of array)
      {
        let mesh = item[0];
        let ti = item[1];
        this.getTriangleVertices(mesh, ti, pointA, pointB, pointC);
        if (ray.intersectTriangle(pointA, pointB, pointC, false, target))
        {
          return target.z;
        }
      }
    }
    return -Infinity;
  }

  getRaycasterElevation(x, y)
  {
    const origin = new THREE.Vector3(x, y, 10000);
    const direction = new THREE.Vector3(0, 0, -1);
    const raycaster = new THREE.Raycaster(origin, direction);

    const intersects = raycaster.intersectObject(this.terrainObject);

    if (intersects.length > 0)
    {
      const intersect = intersects[0];
      return intersect.point.z;
    }
    return -Infinity;
  }
}

export { ElevationMap };



