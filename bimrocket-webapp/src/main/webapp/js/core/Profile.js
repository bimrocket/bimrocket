/**
 * Profile.js
 *
 * @author realor
 */

import { Formula } from "../formula/Formula.js";
import { ProfileGeometry } from "./ProfileGeometry.js";
import * as THREE from "three";

class Profile extends THREE.LineSegments
{
  /* a Profile is an Object3D that represents the outline of a 2D path */

  static ProfileMaterial = new THREE.LineBasicMaterial(
  {
    name: 'ProfileMaterial',
    color: 0x0,
    opacity : 0.8,
    linewidth: 1.5,
    transparent : true
  });

  constructor(profileGeometry, material = Profile.ProfileMaterial)
  {
    super(profileGeometry, material);
    this.type = "Profile";

    this.builder = null;
  }

  raycast(raycaster, intersects)
  {
    const geometry = this.geometry;
    if (this.visible && geometry instanceof ProfileGeometry)
    {
      const threshold = raycaster.params.Line.threshold;
      const localThreshold = threshold /
        ((this.scale.x + this.scale.y + this.scale.z) / 3);
      const localThresholdSq = localThreshold * localThreshold;
      const path = geometry.path;
      const matrixWorld = this.matrixWorld;

      const points = path.getPoints(geometry.divisions);
      const point1 = new THREE.Vector3();
      const point2 = new THREE.Vector3();
      const interRay = new THREE.Vector3();
      const interSegment = new THREE.Vector3();
      const localRay = new THREE.Ray();
      const inverseMatrixWorld = new THREE.Matrix4();
      inverseMatrixWorld.copy(matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(inverseMatrixWorld);

      for (let i = 0; i < points.length; i++)
      {
        let j = (i + 1) % points.length;

        point1.set(points[i].x, points[i].y, 0);
        point2.set(points[j].x, points[j].y, 0);

        const distSq = localRay.distanceSqToSegment(point1, point2,
          interRay, interSegment);
        if (distSq < localThresholdSq)
        {
          interRay.applyMatrix4(matrixWorld);  // to world

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

export { Profile };


