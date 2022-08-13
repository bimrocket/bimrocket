/**
 * Cord.js
 *
 * @author realor
 */

import { Formula } from "../formula/Formula.js";
import { CordGeometry } from "./CordGeometry.js";
import * as THREE from "../lib/three.module.js";

class Cord extends THREE.LineSegments
{
  /* a Cord is an Object3D that represents a 3D curve */

  static CordMaterial = new THREE.LineBasicMaterial(
  {
    name: 'CordMaterial',
    color: 0x205030,
    opacity : 0.8,
    linewidth: 1.5,
    transparent : true
  });

  constructor(cordGeometry, material = Cord.CordMaterial)
  {
    super(cordGeometry, material);
    this.type = "Cord";

    this.builder = null;
  }

  raycast(raycaster, intersects)
  {
    const geometry = this.geometry;
    if (this.visible && geometry instanceof CordGeometry)
    {
      const threshold = raycaster.params.Line.threshold;
      const localThreshold = threshold /
        ((this.scale.x + this.scale.y + this.scale.z) / 3);
      const localThresholdSq = localThreshold * localThreshold;
      const matrixWorld = this.matrixWorld;

      const points = geometry.points;
      const interRay = new THREE.Vector3();
      const interSegment = new THREE.Vector3();
      const localRay = new THREE.Ray();
      const inverseMatrixWorld = new THREE.Matrix4();
      inverseMatrixWorld.copy(matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(inverseMatrixWorld);

      for (let i = 0; i < points.length - 1; i++)
      {
        let j = i + 1;

        let point1 = points[i];
        let point2 = points[j];

        const distSq = localRay.distanceSqToSegment(point1, point2,
          interRay, interSegment);
        if (distSq < localThresholdSq)
        {
          interRay.applyMatrix4(matrixWorld); // to world

          const distance = raycaster.ray.origin.distanceTo(interRay);

          intersects.push(
            {
              distance : distance,
              object : this,
              point : interRay.clone().applyMatrix4(matrixWorld) // to world
            }
          );
        }
      }
    }
  }

  updateGeometry(geometry)
  {
    if (this.geometry) this.geometry.dispose();
    this.geometry = geometry;
  }

	copy(source)
  {
		super.copy(source);

		this.material = source.material;
		this.geometry = source.geometry;
    this.builder = source.builder ? source.builder.clone() : null;

    Formula.copy(this, source);

		return this;
	}
}

export { Cord };


