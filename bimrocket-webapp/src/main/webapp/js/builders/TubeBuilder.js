/*
 * TubeBuilder.js
 *
 * @author jiponsI2cat
 */

import { ObjectBuilder } from "./ObjectBuilder.js";
import * as THREE from "three";

class TubeBuilder extends ObjectBuilder 
{
  constructor(radius = 6.0, zScale = 0.001, zOffset = -1, segmentsMultiplier = 4, profileEdges = 8, looping = false) 
  {
    super();
    this.type = "tube";
    this.radius = radius;
    this.zScale = zScale;
    this.zOffset = zOffset;
    this.segmentsMultiplier = segmentsMultiplier;
    this.profileEdges = profileEdges;
    this.looping = looping;
  }

  performBuild(object) 
  {
    let source = object;
    if (!object.geometry || !object.geometry.type.includes("CordGeometry")) 
    {
      source = object.children.find(c => c.geometry && c.geometry.type.includes("CordGeometry"));
    }

    if (source && source.geometry && source.geometry.type.includes("CordGeometry"))
    {
      try {
        const attr = source.geometry.attributes.position;
        if (!attr) return;

        const points = [];
        for (let i = 0; i < attr.count; i++) 
          {
          const v = new THREE.Vector3().fromBufferAttribute(attr, i);
          if (v && (points.length === 0 || v.distanceTo(points[points.length - 1]) > 0.01)) 
          {
            points.push(v);
          }
        }

        if (points.length > 1) 
        {
          const curve = new THREE.CatmullRomCurve3(points);
          const tubeGeo = new THREE.TubeGeometry(curve, points.length * this.segmentsMultiplier, this.radius, this.profileEdges, this.looping);
          object.geometry = tubeGeo;
          
          if (object.material) 
          {
            object.material.wireframe = false;
            object.material.needsUpdate = true;
          }
          
          object.edgesVisible = false;
          object.scale.set(1, 1, this.zScale);

          let randomOffset = this.zOffset + Math.floor(Math.random() * 10);
          object.position.z += randomOffset;

          // if source is child (WFS ADD_OBJECT mode), we hidden it to avoid duplication
          if (source !== object) source.visible = false;
          
          object.updateMatrix();
          object.updateMatrixWorld(true);
        }
      } catch (e) 
      {
        console.error("TubeBuilder Error: Tube generation from Cord failed. Details: ", e);
      }
    }
    else 
    {
      console.error("TubeBuilder Error: Object neither children do not contain CordGeometry");
    }
  }

  clone() 
  {
    return new TubeBuilder(this.radius);
  }
}

export { TubeBuilder };

