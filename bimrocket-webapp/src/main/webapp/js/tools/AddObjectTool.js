/*
 * AddObjectTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { ObjectBuilder } from "../core/ObjectBuilder.js";
import { Extruder } from "../core/builders/Extruder.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "../lib/three.module.js";

class AddObjectTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "add_object";
    this.label = "tool.add_object.label";
    this.help = "tool.add_object.help";
    this.className = "add_object";
    this.immediate = true;
    this.setOptions(options);
    this.counter = 0;
  }

  execute()
  {
    var objectType = this.objectType || "group";

    var object;
    if (objectType === "group")
    {
      object = new THREE.Group();
    }
    else
    {
      object = new Solid();

      var geometry;
      switch (objectType)
      {
        case "box":
          geometry = new SolidGeometry();
          let vertices = geometry.vertices;
          vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
          vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
          vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
          vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));

          vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
          vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
          vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
          vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));

          geometry.addFace(3, 2, 1, 0);
          geometry.addFace(4, 5, 6, 7);
          geometry.addFace(0, 1, 5, 4);
          geometry.addFace(1, 2, 6, 5);
          geometry.addFace(2, 3, 7, 6);
          geometry.addFace(3, 0, 4, 7);
          object.updateGeometry(geometry);
          break;
        case "cylinder":
          geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
          var rad = THREE.MathUtils.degToRad(90);
          var matrix = new THREE.Matrix4().makeRotationX(rad);
          geometry.applyMatrix4(matrix);
          object.updateGeometry(geometry);
          break;
        case "sphere":
          geometry = new THREE.SphereGeometry(0.5, 24, 24);
          var rad = THREE.MathUtils.degToRad(90);
          var matrix = new THREE.Matrix4().makeRotationX(rad);
          geometry.applyMatrix4(matrix);
          object.updateGeometry(geometry);
          break;
        default:
          var shape = new THREE.Shape();
          let size = 0.5;
          shape.moveTo(-size, -size);
          shape.lineTo(size, -size);
          shape.lineTo(2 * size, 0);
          shape.lineTo(size, size);
          shape.lineTo(-size, size);
          shape.closePath();
          var hole = new THREE.Path();
          hole.moveTo(-size / 2, -size / 2);
          hole.lineTo(size / 2, -size / 2);
          hole.lineTo(size / 2, size / 2);
          hole.lineTo(-size / 2, size / 2);
          hole.closePath();
          shape.holes.push(hole);
          hole = new THREE.Path();
          hole.moveTo(-size / 4 + 0.5, -size / 4);
          hole.lineTo(size / 4 + 0.5, -size / 4);
          hole.lineTo(size / 4 + 0.5, size / 4);
          hole.lineTo(-size / 4 + 0.5, size / 4);
          hole.closePath();
          shape.holes.push(hole);

          let profile = new Profile(new ProfileGeometry(shape));
          object.add(profile);
          object.builder = new Extruder(this.height);
          ObjectBuilder.build(object);
      }
    }
    this.counter++;
    object.name = objectType + "_" + this.counter;

    this.application.addObject(object, null, true);
  }
}

export { AddObjectTool };
