/**
 * ElevationMap.js
 *
 * @author realor
 */

import * as THREE from "three";

class ElevationMap
{
  static ELEVATION_MAP = "_elevationMap";

  constructor(terrainObject, tileSize = 5)
  {
    this.terrainObject = terrainObject;
    this.map = new Map();
    this.tileSize = tileSize;
    this._terrainMatrix = new THREE.Matrix4(); // WCS => TCS matrx
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
    this.updateTerrainMatrix();

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
    const geometry = mesh.geometry;
    const indexAttribute = geometry.getIndex();
    const positionAttribute = geometry.getAttribute("position");
    const triangleCount = indexAttribute ?
      indexAttribute.array.length / 3 :
      positionAttribute.array.length / (positionAttribute.itemSize * 3);

    const pointA = new THREE.Vector3();
    const pointB = new THREE.Vector3();
    const pointC = new THREE.Vector3();

    for (let ti = 0; ti < triangleCount; ti++)
    {
      this.getTriangleVertices(mesh, ti, pointA, pointB, pointC);
      this.processTriangle(mesh, ti, pointA, pointB, pointC);
    }
  }

  /**
   * Put triangle in ElevationMap cells.
   *
   * @param {Mesh} mesh - the Mesh to process
   * @param {Number} ti - the triangle index in the Mesh
   * @param {Vector3} pointA - triangle vertex A in terrainObject CS (input)
   * @param {Vector3} pointB - triangle vertex B in terrainObject CS (input)
   * @param {Vector3} pointC - triangle vertex C in terrainObject CS (input)
   */
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

  /**
   * Returns the triangle coordinates is terrainObject CS.
   *
   * @param {Mesh} mesh - the Mesh to process
   * @param {Number} ti - the triangle index in the Mesh
   * @param {Vector3} pointA - triangle vertex A in terrainObject CS (output)
   * @param {Vector3} pointB - triangle vertex B in terrainObject CS (output)
   * @param {Vector3} pointC - triangle vertex C in terrainObject CS (output)
   */
  getTriangleVertices(mesh, ti, pointA, pointB, pointC)
  {
    const geometry = mesh.geometry;
    const matrixWorld = mesh.matrixWorld;
    const positionAttribute = geometry.getAttribute("position");
    const positionArray = positionAttribute.array;
    const itemSize = positionAttribute.itemSize;
    const indexAttribute = geometry.getIndex();
    const terrainMatrix = this._terrainMatrix;

    let v0 = 3 * ti;
    let v1 = v0 + 1;
    let v2 = v0 + 2;

    if (indexAttribute)
    {
      const indexArray = indexAttribute.array;
      v0 = indexArray[v0];
      v1 = indexArray[v1];
      v2 = indexArray[v2];
    }

    const vi0 = itemSize * v0;
    const vi1 = itemSize * v1;
    const vi2 = itemSize * v2;

    pointA.set(positionArray[vi0],
      positionArray[vi0 + 1],
      itemSize === 3 ? positionArray[vi0 + 2] : 0);

    pointB.set(positionArray[vi1],
      positionArray[vi1 + 1],
      itemSize === 3 ? positionArray[vi1 + 2] : 0);

    pointC.set(positionArray[vi2],
      positionArray[vi2 + 1],
      itemSize === 3 ? positionArray[vi2 + 2] : 0);

    pointA.applyMatrix4(matrixWorld).applyMatrix4(terrainMatrix);
    pointB.applyMatrix4(matrixWorld).applyMatrix4(terrainMatrix);
    pointC.applyMatrix4(matrixWorld).applyMatrix4(terrainMatrix);
  }

  /**
   * Gets terrain elevation for (x, y) in WCS
   *
   * @param {Number} x - the X coordinate in WCS
   * @param {Number} y - the Y coordinate in WCS
   * @returns {Number} - The elevation for (x, y) in WCS
   */
  getElevation(x, y)
  {
    const origin = new THREE.Vector3(x, y, 10000);
    const terrainMatrix = this._terrainMatrix;

    // transform to terrainObject CS
    origin.applyMatrix4(terrainMatrix);

    const direction = new THREE.Vector3(0, 0, -1);
    const ray = new THREE.Ray(origin, direction);

    const tx = Math.floor(origin.x / this.tileSize);
    const ty = Math.floor(origin.y / this.tileSize);
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
          // transform to WCS
          target.applyMatrix4(this.terrainObject.matrixWorld);
          return target.z;
        }
      }
    }
    return -Infinity;
  }

  updateTerrainMatrix()
  {
    this._terrainMatrix.copy(this.terrainObject.matrixWorld).invert();
  }
}

export { ElevationMap };



