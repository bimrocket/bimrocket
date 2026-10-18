/**
 * Controls.js
 *
 * @author realor
 */

import * as THREE from "three";

class DirectionHelper extends THREE.LineSegments
{
  constructor(size = 1, color = 0x0)
  {
    const h = size / 2;

    const positions = new Float32Array(
    [
      -h, -h, 0,   h, -h, 0,
       h, -h, 0,   h,  h, 0,
       h,  h, 0,  -h,  h, 0,
      -h,  h, 0,  -h, -h, 0,
       0,  0, 0,   0,  0, size
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ color, toneMapped: false });

    super(geometry, material);

    this.type = "DirectionHelper";
    this.size = size;
    this.matrixAutoUpdate = true;
  }

  dispose()
  {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export { DirectionHelper };