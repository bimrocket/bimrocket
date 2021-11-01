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
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { HelicoidBuilder } from "../builders/HelicoidBuilder.js";
import { RectangleBuilder } from "../builders/RectangleBuilder.js";
import { CircleBuilder } from "../builders/CircleBuilder.js";
import { Extruder } from "../builders/Extruder.js";
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
    const objectType = this.objectType || "Group";
    let object;

    switch (objectType)
    {
      case "Group":
        object = new THREE.Group();
        break;
      case "Box":
        object = this.createBox();
        break;
      case "Cylinder":
        object = this.createCylinder();
        break;
      case "Sphere":
        object = this.createSphere();
        break;
      case "Spring":
        object = this.createSpring();
        break;
      case "Logo":
        object = this.createLogo();
        break;
      case "Rectangle":
        object = this.createProfile("RectangleBuilder");
        break;
      case "RectangleHollow":
        object = this.createProfile("RectangleHollowBuilder");
        break;
      case "Circle":
        object = this.createProfile("CircleBuilder");
        break;
      case "CircleHollow":
        object = this.createProfile("CircleHollowBuilder");
        break;
      case "Ellipse":
        object = this.createProfile("EllipseBuilder");
        break;
      case "Trapezium":
        object = this.createProfile("TrapeziumBuilder");
        break;
      case "IProfile":
        object = this.createProfile("IProfileBuilder");
        break;
      case "LProfile":
        object = this.createProfile("LProfileBuilder");
        break;
      case "TProfile":
        object = this.createProfile("TProfileBuilder");
        break;
      case "UProfile":
        object = this.createProfile("UProfileBuilder");
        break;
      case "ZProfile":
        object = this.createProfile("ZProfileBuilder");
        break;
      case "ZProfile":
        object = this.createProfile("ZProfileBuilder");
        break;
      case "Helicoid":
        object = this.createCord("HelicoidBuilder");
        break;
      case "Sprite":
        object = this.createSprite();
        break;
    }
    if (object)
    {
      this.counter++;
      object.name = objectType + "_" + this.counter;

      this.application.addObject(object, null, false, true);
    }
  }

  createBox()
  {
    const solid = new Solid();
    const profile = new Profile();
    profile.name = "Rectangle";
    profile.builder = new RectangleBuilder(1, 1);
    solid.add(profile);
    solid.builder = new Extruder(1);
    ObjectBuilder.build(solid);
    return solid;
  }

  createCylinder()
  {
    const solid = new Solid();
    const profile = new Profile();
    profile.name = "Circle";
    profile.builder = new CircleBuilder(0.5, 24);
    solid.add(profile);
    solid.builder = new Extruder(1);
    ObjectBuilder.build(solid);
    return solid;
  }

  createSphere()
  {
    const solid = new Solid();
    const geometry = new THREE.SphereGeometry(0.5, 24, 24);
    const rad = THREE.MathUtils.degToRad(90);
    const matrix = new THREE.Matrix4().makeRotationX(rad);
    geometry.applyMatrix4(matrix);
    solid.updateGeometry(geometry);
    return solid;
  }

  createSpring()
  {
    const solid = new Solid();
    let cord = new Cord();
    cord.name = "Helicoid";
    cord.builder = new HelicoidBuilder();
    ObjectBuilder.build(cord);
    solid.add(cord);
    const profile = new Profile();
    profile.name = "Circle";
    profile.builder = new CircleBuilder(0.2);
    solid.add(profile);
    solid.builder = new Extruder();
    ObjectBuilder.build(solid);
    return solid;
  }

  createLogo()
  {
    const solid = new Solid();
    const shape = new THREE.Shape();
    const size = 0.5;
    shape.moveTo(-size, -size);
    shape.lineTo(size, -size);
    shape.lineTo(2 * size, 0);
    shape.lineTo(size, size);
    shape.lineTo(-size, size);
    shape.closePath();
    const hole = new THREE.Path();
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

    const profile = new Profile(new ProfileGeometry(shape));
    solid.add(profile);
    solid.builder = new Extruder(this.height);
    ObjectBuilder.build(solid);
    return solid;
  }

  createProfile(profileBuilderName)
  {
    const cls = ObjectBuilder.classes[profileBuilderName];
    if (cls === undefined) return;

    const builder = new cls();
    const profile = new Profile();
    profile.builder = builder;
    ObjectBuilder.build(profile);
    return profile;
  }

  createCord(cordBuilderName)
  {
    const cls = ObjectBuilder.classes[cordBuilderName];
    if (cls === undefined) return;

    const builder = new cls();
    const cord = new Cord();
    cord.builder = builder;
    ObjectBuilder.build(cord);
    return cord;
  }

  createSprite()
  {
    const texture = this.application.loadTexture("textures/sphere.png");

    const material = new THREE.SpriteMaterial({
      name: "sphere",
      map: texture,
      color: 0xffffff,
      sizeAttenuation: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.1, 0.1, 0.1);
    return sprite;
  }
}

export { AddObjectTool };
