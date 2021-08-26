/**
 * Link.js
 *
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class Link extends THREE.Object3D
{
  constructor(object)
  {
    super();
    this.linkedObject = object;
    this.name = "Link: " + object.name;
    this.update();
  }

  update()
  {
    this.clear();
    this.add(this.linkedObject.clone());
  }
}

export { Link };




