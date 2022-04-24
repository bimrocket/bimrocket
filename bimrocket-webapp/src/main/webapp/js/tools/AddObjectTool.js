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
      case "Test":
        object = this.test();
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
    solid.builder.smoothAngle = 20;
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
    const solidGeometry = new SolidGeometry();
    solidGeometry.copy(geometry);
    solidGeometry.smoothAngle = 20;
    solid.updateGeometry(solidGeometry, true);
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
    solid.builder.smoothAngle = 30;
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
    const manager = this.application.loadingManager;
    const textureLoader = new THREE.TextureLoader(manager);
    const texture = textureLoader.load("textures/sphere.png");

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

  test()
  {
    const group = new THREE.Group();
    group.add(this.test1());
    group.add(this.test2());
    group.add(this.test3());
    group.add(this.test4());
    group.add(this.test5());

    group.updateMatrix();

    return group;
  }

  test1()
  {
    const geometry = new SolidGeometry();
    geometry.addFace(new THREE.Vector3(0, 0, 0),
                     new THREE.Vector3(1, 0, 0),
                     new THREE.Vector3(1, 1, 0),
                     new THREE.Vector3(0.7, 0.7, 0),
                     new THREE.Vector3(0.7, 0.3, 0),
                     new THREE.Vector3(0.3, 0.3, 0),
                    );

    geometry.addFace(new THREE.Vector3(1, 1, 0),
                     new THREE.Vector3(0, 1, 0),
                     new THREE.Vector3(0, 0, 0));

    const solid = new Solid(geometry);
    solid.position.x = 0;
    solid.updateMatrix();

    return solid;
  }

  test2()
  {
    const geometry = new SolidGeometry();
    geometry.addFace(new THREE.Vector3(0, 0, 0),
                     new THREE.Vector3(1, 0, 0),
                     new THREE.Vector3(1, 1, 0),
                     new THREE.Vector3(0.7, 0.7, 0),
                     new THREE.Vector3(0.7, 0.3, 0),
                     new THREE.Vector3(0.3, 0.3, 0),
                    );

    geometry.addFace(new THREE.Vector3(1, 1, 0),
                     new THREE.Vector3(0, 1, 0),
                     new THREE.Vector3(0, 0, 0),
                     new THREE.Vector3(0.3, 0.3, 0),
                     new THREE.Vector3(0.3, 0.7, 0),
                     new THREE.Vector3(0.7, 0.7, 0));

    const solid = new Solid(geometry);
    solid.position.x = 2;
    solid.updateMatrix();

    return solid;
  }

  test3()
  {
    const geometry = new SolidGeometry();
    geometry.addFace(new THREE.Vector3(0, 0, 0),
                     new THREE.Vector3(1, 0, 0),
                     new THREE.Vector3(2, 0, 0),
                     new THREE.Vector3(2, 1, 0),
                     new THREE.Vector3(1, 0.00001, 0),
                    );

    const solid = new Solid(geometry);
    solid.position.x = 3.5;
    solid.updateMatrix();

    return solid;
  }

  test4()
  {
    const geometry = new SolidGeometry();
    let v0 = new THREE.Vector3(0, 0, 0);
    let v1 = new THREE.Vector3(0.7, 0, 0);
    let v2 = new THREE.Vector3(1, 0, 0);
    let v3 = new THREE.Vector3(1, 0.7, 0);
    let v4 = new THREE.Vector3(1, 1, 0);
    let v5 = new THREE.Vector3(0.3, 1, 0);
    let v6 = new THREE.Vector3(0, 1, 0);
    let v7 = new THREE.Vector3(0, 0.3, 0);
    let v8 = new THREE.Vector3(0.3, 0.3, 0);
    let v9 = new THREE.Vector3(0.7, 0.3, 0);
    let v10 = new THREE.Vector3(0.7, 0.7, 0);
    let v11 = new THREE.Vector3(0.3, 0.7, 0);

    geometry.addFace(v0, v1, v9, v7);
//    geometry.addFace(v1, v2, v3, v10);
    geometry.addFace(v10, v3, v2, v1);

    geometry.addFace(v3, v4, v5, v11);
    geometry.addFace(v5, v6, v7, v8);

    const solid = new Solid(geometry);
    solid.position.x = 6;
    solid.updateMatrix();

    return solid;
  }

  test5()
  {
    const geometry = new SolidGeometry();
    let v0 = new THREE.Vector3(0, 0, 0);
    let v1 = new THREE.Vector3(1, 0, 0);
    let v2 = new THREE.Vector3(1, 1, 0);
    let v3 = new THREE.Vector3(0, 1, 0);
    let v4 = new THREE.Vector3(0.3, 0.3, 0);
    let v5 = new THREE.Vector3(0.7, 0.7, 0);

    geometry.addFace(v0, v1, v4);
    geometry.addFace(v1, v5, v4);
    geometry.addFace(v1, v2, v5);
    geometry.addFace(v0, v2, v3);

    const solid = new Solid(geometry);
    solid.position.x = 0;
    solid.position.y = 2;
    solid.updateMatrix();

    return solid;
  }
}

export { AddObjectTool };
