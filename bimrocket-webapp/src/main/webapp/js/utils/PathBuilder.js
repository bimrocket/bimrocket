/**
 * PathBuilder.js
 * 
 * @author realor
 */

import * as THREE from "../lib/three.module.js";

class PathBuilder
{
  static vector = new THREE.Vector3();
  static path = null;
  static matrix = null;

  static setup(path, matrix)
  {
    this.path = path;
    this.matrix = matrix;
  }
  
  static moveTo(x, y)
  {
    const vector = this.vector;
    vector.set(x, y, 0);
    vector.applyMatrix4(this.matrix);
    this.path.moveTo(vector.x, vector.y);
  }

  static lineTo(x, y)
  {
    const vector = this.vector;
    vector.set(x, y, 0);
    vector.applyMatrix4(this.matrix);
    this.path.lineTo(vector.x, vector.y);
  }
  
  static close()
  {
    this.path.closePath();
  }
  
  static rectangle(width, height)
  {
    const xdim = 0.5 * width;
    const ydim = 0.5 * height;

    this.moveTo(-xdim, -ydim);
    this.lineTo(xdim, -ydim);
    this.lineTo(xdim, ydim);
    this.lineTo(-xdim, ydim);
    this.close();
  }
  
  static circle(radius, segments)
  {
    const incr = 2 * Math.PI / segments;

    this.moveTo(radius, 0);
    for (let rad = incr; rad < 2 * Math.PI; rad += incr)
    {
      this.lineTo(radius * Math.cos(rad), radius * Math.sin(rad));
    }
    this.close();   
  }

  static ellipse(xradius, yradius, segments)
  {
    const incr = 2 * Math.PI / segments;

    this.moveTo(xradius, 0);
    for (let rad = incr; rad < 2 * Math.PI; rad += incr)
    {
      this.lineTo(xradius * Math.cos(rad), yradius * Math.sin(rad));
    }
    this.close();
  }
}

export { PathBuilder };

