/*
 * AddObjectTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Cord } from "../core/Cord.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ObjectBuilder } from "../core/builders/ObjectBuilder.js";
import { SpringBuilder } from "../core/builders/SpringBuilder.js";
import { RectangleBuilder } from "../core/builders/RectangleBuilder.js";
import { CircleBuilder } from "../core/builders/CircleBuilder.js";
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
    const objectType = this.objectType || "group";

    let object;
    if (objectType === "group")
    {
      object = new THREE.Group();
    }
    else
    {
      object = new Solid();

      let geometry, shape, size, profile;
      switch (objectType)
      {
        case "box":
          profile = new Profile();
          profile.builder = new RectangleBuilder(1, 1);
          object.add(profile);
          object.builder = new Extruder(1);
          ObjectBuilder.build(object);
          break;
        case "cylinder":
          profile = new Profile();
          profile.builder = new CircleBuilder(0.5, 24);
          object.add(profile);
          object.builder = new Extruder(1);
          ObjectBuilder.build(object);
          break;
        case "sphere":
          geometry = new THREE.SphereGeometry(0.5, 24, 24);
          var rad = THREE.MathUtils.degToRad(90);
          var matrix = new THREE.Matrix4().makeRotationX(rad);
          geometry.applyMatrix4(matrix);
          object.updateGeometry(geometry);
          break;
        case "spring":
          let cord = new Cord();
          cord.builder = new SpringBuilder();
          ObjectBuilder.build(cord);
          object.add(cord);
          profile = new Profile();
          profile.builder = new CircleBuilder(0.2);
          object.add(profile);
          object.builder = new Extruder();
          ObjectBuilder.build(object);
          break;
        default:
          shape = new THREE.Shape();
          size = 0.5;
          shape.moveTo(-size, -size);
          shape.lineTo(size, -size);
          shape.lineTo(2 * size, 0);
          shape.lineTo(size, size);
          shape.lineTo(-size, size);
          shape.closePath();
          let hole = new THREE.Path();
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

          profile = new Profile(new ProfileGeometry(shape));
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
