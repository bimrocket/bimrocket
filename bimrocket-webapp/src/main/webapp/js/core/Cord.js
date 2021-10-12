/**
 * Cord.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class Cord extends THREE.LineSegments
{
  /* a Cord is an Object3D that represents a 3D curve */

  constructor(cordGeometry, material)
  {
    super(cordGeometry, material);
    this.type = "Cord";

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

export { Cord };


