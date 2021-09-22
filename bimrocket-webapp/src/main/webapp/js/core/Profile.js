/**
 * Profile.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class Profile extends THREE.LineSegments
{
  constructor(geometry, material)
  {
    super(geometry, material);
    this.type = "Profile";

    this.builder = null;
  }

  raycast(raycaster, intersects)
  {
    // TODO:
  }
}

export { Profile };


