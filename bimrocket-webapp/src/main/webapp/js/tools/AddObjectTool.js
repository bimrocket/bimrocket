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
import { Text2D } from "../core/Text2D.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { HelicoidBuilder } from "../builders/HelicoidBuilder.js";
import { RectangleBuilder } from "../builders/RectangleBuilder.js";
import { CircleBuilder } from "../builders/CircleBuilder.js";
import { TrapeziumBuilder } from "../builders/TrapeziumBuilder.js";
import { CircularSectorBuilder } from "../builders/CircularSectorBuilder.js";
import { Extruder } from "../builders/Extruder.js";
import { Revolver } from "../builders/Revolver.js";
import { Formula } from "../formula/Formula.js";
import { I18N } from "../i18n/I18N.js";
import * as THREE from "three";

class AddObjectTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "add_object";
    this.label = "tool.add_object.label";
    this.help = "tool.add_object.help";
    this.className = "add_object";

    this.objectType = null;
    this.builderClass = null;

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.counter = 0;
  }

  execute()
  {
    const objectType = this.objectType || "Group";
    console.info("objectType " + objectType);
    
    let object;

    switch (objectType)
    {
      case "Object3D":
        object = new THREE.Object3D();
        break;
      case "Group":
        object = new THREE.Group();
        break;
      case "Box":
        object = this.createBox();
        break;
      case "Cylinder":
        object = this.createCylinder();
        break;
      case "Cone":
        object = this.createCone();
        break;
      case "Sphere":
        object = this.createSphere();
        break;
      case "Torus":
        object = this.createTorus();
        break;
      case "Spring":
        object = this.createSpring();
        break;
      case "Logo":
        object = this.createLogo();
        break;
      case "Profile":
        object = this.createProfile(this.builderClass);
        break;
      case "Cord":
        object = this.createCord(this.builderClass);
        break;
      case "Text2D":
        object = this.createText2D();
        break;
      case "Sprite":
        object = this.createSprite();
        break;
      case "PerspectiveCamera":
        object = this.createPerspectiveCamera();
        break;
      case "OrthographicCamera":
        object = this.createOrthographicCamera();
        break;
      case "AmbientLight":
        object = this.createAmbientLight();
        break;
      case "HemisphereLight":
        object = this.createHemisphereLight();
        break;
      case "DirectionalLight":
        object = this.createDirectionalLight();
        break;
      case "PointLight":
        object = this.createPointLight();
        break;
      case "SpotLight":
        object = this.createSpotLight();
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
    profile.builder = new CircleBuilder(0.5, 32);
    solid.add(profile);
    solid.builder = new Extruder(1);
    solid.builder.smoothAngle = 20;
    ObjectBuilder.build(solid);
    return solid;
  }

  createCone()
  {
    const solid = new Solid();
    const profile = new Profile();
    profile.name = "Trapezium";
    profile.builder = new TrapeziumBuilder(0.5, 1, 0, 0);
    profile.position.x = 0.25;
    Formula.create(profile, "position.x", "builder.bottomXDim / 2");
    profile.updateMatrix();
    solid.add(profile);
    solid.builder = new Revolver(360);
    solid.builder.axis.x = 0;
    solid.builder.axis.y = -1;
    solid.builder.smoothAngle = 20;
    solid.builder.optimize = false;
    solid.builder.segments = 20;

    ObjectBuilder.build(solid);
    solid.rotation.x = Math.PI / 2;

    return solid;
  }

  createSphere()
  {
    const solid = new Solid();
    const profile = new Profile();
    profile.name = "CircularSector";
    profile.builder = new CircularSectorBuilder(0.5, 180, 32);
    solid.add(profile);
    solid.builder = new Revolver(360);
    solid.builder.axis.x = 1;
    solid.builder.axis.y = 0;
    solid.builder.smoothAngle = 20;
    solid.builder.optimize = false;
    ObjectBuilder.build(solid);
    solid.rotation.y = Math.PI / 2;

    return solid;
  }

  createTorus()
  {
    const solid = new Solid();
    const profile = new Profile();
    profile.name = "Circle";
    profile.builder = new CircleBuilder(0.5, 20);
    profile.position.x = -1;
    profile.updateMatrix();
    solid.add(profile);
    solid.builder = new Revolver(360);
    solid.builder.axis.x = 0;
    solid.builder.axis.y = 1;
    solid.builder.smoothAngle = 20;
    solid.builder.optimize = false;
    solid.builder.segments = 20;

    ObjectBuilder.build(solid);
    solid.rotation.x = Math.PI / 2;

    return solid;
  }

  createText2D()
  {
    const text = new Text2D();
    text.position.set(0, 0, 0);
    text.updateMatrix();
    return text;
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

  createProfile(profileBuilderClass)
  {
    const builder = new profileBuilderClass();
    const profile = new Profile();
    profile.builder = builder;
    ObjectBuilder.build(profile);
    return profile;
  }

  createCord(cordBuilderClass)
  {
    const builder = new cordBuilderClass();
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

  createPerspectiveCamera()
  {
    const container = this.application.container;
    let camera = new THREE.PerspectiveCamera(60,
      container.clientWidth / container.clientHeight, 0.1, 4000);
    camera.name = "PerspectiveCamera";
    return camera;
  }

  createOrthographicCamera()
  {
    const container = this.application.container;
    let camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 4000);
    camera.name = "OrthographicCamera";
    return camera;
  }

  createAmbientLight()
  {
    const light = new THREE.AmbientLight(0xf0f0f0);
    light.name = "AmbientLight";
    return light;
  }

  createHemisphereLight()
  {
    const light = new THREE.HemisphereLight(0xf0f0f0, 0x808080, 1);
    light.name = "HemisphereLight";
    return light;
  }

  createDirectionalLight()
  {
    const light = new THREE.DirectionalLight(0xFFFFFF, 1);
    light.name = "DirectionalLight";
    light.castShadow = true;
    this.setupShadow(light);
    return light;
  }

  createPointLight()
  {
    const light = new THREE.PointLight(0xf0f0f0, 1, 100);
    light.name = "PointLight";
    this.setupShadow(light);
    return light;
  }

  createSpotLight()
  {
    const angle = 30; // degrees
    const light = new THREE.SpotLight(0xf0f0f0, 1, 100,
      THREE.MathUtils.degToRad(angle));
    light.name = "SpotLight";
    this.setupShadow(light);
    return light;
  }

  setupShadow(light)
  {
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.left = -40;
    light.shadow.camera.right = 40;
    light.shadow.camera.top = 40;
    light.shadow.camera.bottom = -40;
    light.shadow.camera.far = 3000;
    light.shadow.camera.near = 0.01;
    light.shadow.camera.matrixAutoUpdate = true;
    light.shadow.bias = -0.0001;
    light.target = this.application.scene;
  }
}

export { AddObjectTool };
