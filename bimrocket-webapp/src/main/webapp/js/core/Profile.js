/**
 * Profile.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class Profile extends THREE.LineSegments
{
  /* a Profile is an Object3D that represents the outline of a 2D path */

  constructor(profileGeometry, material)
  {
    super(profileGeometry, material);
    this.type = "Profile";

    this.builder = null;
  }

  raycast(raycaster, intersects)
  {
    // TODO:
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

		return this;
	}
}

export { Profile };


