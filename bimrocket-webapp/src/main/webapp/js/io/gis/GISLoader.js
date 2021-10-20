/**
 * GISLoader.js
 *
 * @author realor
 */

import { ObjectBuilder } from "../../builders/ObjectBuilder.js";
import { Solid } from "../../core/Solid.js";
import { SolidGeometry } from "../../core/SolidGeometry.js";
import { Profile } from "../../core/Profile.js";
import { ProfileGeometry } from "../../core/ProfileGeometry.js";
import { Cord } from "../../core/Cord.js";
import { CordGeometry } from "../../core/CordGeometry.js";
import { Extruder } from "../../builders/Extruder.js";
import { ColladaLoader } from "../ColladaLoader.js";
import * as THREE from "../../lib/three.module.js";

class GISLoader extends THREE.Loader
{
  constructor(mimeType)
  {
    super();
    this.mimeType = mimeType;
    this.origin = new THREE.Vector3(420878, 4582247, 0);
    this.lineMaterials = {};
    this.meshMaterials = {};
    this.modelLoaders = {};
    this.modelCount = 0;
    this.options = {};
    this.offset = new THREE.Vector3();
  }

  load(url, onLoad, onProgress, onError)
  {
    var options = this.options;
    this.modelLoaders = {};
    this.modelCount = 0;

    var request = new XMLHttpRequest();
    request.open("GET", url, true);

    if (options.username && options.password)
    {
      var basicAutho = "Basic " +
        window.btoa(options.username + ":" + options.password);
      request.setRequestHeader("Authorization", basicAutho);
    }
    request.onreadystatechange = () =>
    {
      if (request.readyState === 4)
      {
        if (request.status === 0 ||
          request.status === 200 || request.status === 207)
        {
          var group = this.parse(request.responseXML ?
            request.responseXML : request.responseText);

          if (this.modelCount > 0)
          {
            this.loadModels(group, onLoad);
          }
          else
          {
            onLoad(group);
          }
        }
      }
    };
    request.send();
  }

  parse(data) // abstract
  {
  }

  loadModels(group, onLoad)
  {
    let onModelLoad = () =>
    {
      this.modelCount--;
      if (this.modelCount === 0)
      {
        onLoad(group); // all objects created
      }
    };
    for (let modelURL in this.modelLoaders)
    {
      let modelLoader = this.modelLoaders[modelURL];
      modelLoader.load(onModelLoad);
    }
  }

  createObject(type, name, coordinates, properties, parent)
  {
    if (type === "Point")
    {
      this.createPoint(name, coordinates, properties, parent);
    }
    else if (type === "MultiPoint")
    {
      this.createMultiPoint(name, coordinates, properties, parent);
    }
    else if (type === "LineString")
    {
      this.createLineString(name, coordinates, properties, parent);
    }
    else if (type === "MultiLineString")
    {
      this.createMultiLineString(name, coordinates, properties, parent);
    }
    else if (type === "Polygon")
    {
      this.createPolygon(name, coordinates, properties, parent);
    }
    else if (type === "MultiPolygon")
    {
      this.createMultiPolygon(name, coordinates, properties, parent);
    }
    else
    {
      this.createNonVisibleObject(name, properties, parent);
    }
  }

  createNonVisibleObject(name, properties, parent)
  {
    let object = new THREE.Object3D();
    this.setObjectProperties(object, name, properties);
    parent.add(object);
  }

  setObjectProperties(object, name, properties)
  {
    object.name = name;
    if (properties)
    {
      object.userData = {GIS: properties};
    }
  }

  createPoint(name, coordinates, properties, parent)
  {
    let modelURL = this.evalExpression(this.options.model, coordinates,
      properties);
    let offset = this.getOffset(coordinates, properties);
    let rotationZ = this.evalExpression(this.options.rotationZ,
      coordinates, properties) || 0;

    if (modelURL) // deferred point creation
    {
      let modelLoader = this.modelLoaders[modelURL];
      if (modelLoader === undefined)
      {
        modelLoader = new GISModelLoader(modelURL);
        this.modelLoaders[modelURL] = modelLoader;
        this.modelCount++;
      }
      modelLoader.listeners.push(model =>
      {
        let object = model.scene.clone();

        object.position.x = coordinates[0] + offset.x;
        object.position.y = coordinates[1] + offset.y;
        let z = coordinates.length === 3 ? coordinates[2] + offset.z : offset.z;
        object.position.z = z;
        object.rotation.z = rotationZ * Math.PI / 180;

        this.setObjectProperties(object, name, properties);
        parent.add(object);
      });
    }
    else // immediate point creation
    {
      if (this.sphereGeometry === undefined)
      {
        this.sphereGeometry = new THREE.SphereGeometry(2, 4, 4);
      }
      let material = this.getMeshMaterial(coordinates, properties);
      let object = new THREE.Mesh(this.sphereGeometry, material);

      object.position.x = coordinates[0] + offset.x;
      object.position.y = coordinates[1] + offset.y;
      let z = coordinates.length === 3 ? coordinates[2] + offset.z : offset.z;
      object.position.z = z;

      this.setObjectProperties(object, name, properties);
      parent.add(object);
    }
  }

  createMultiPoint(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    for (var i = 0; i < coordinates.length; i++)
    {
      var pointCoords = coordinates[i];
      this.createPoint(name + "_" + i, pointCoords, null, group);
    }
    this.setObjectProperties(group, name, properties);
    parent.add(group);
  }

  createLineString(name, coordinates, properties, parent)
  {
    let offset = this.getOffset(coordinates, properties);
    let diameter = this.evalExpression(this.options.diameter, coordinates, properties) || 0.25;

    let vertices = [];
    for (var i = 0; i < coordinates.length; i++)
    {
      let point = coordinates[i];
      let z = point.length === 3 ? point[2] + offset.z : offset.z;
      let v = new THREE.Vector3(
        point[0] + offset.x,
        point[1] + offset.y,
        z);
      vertices.push(v);
    }

    let line = null;
    if (diameter === 0)
    {
      let geometry = new THREE.BufferGeometry();
      geometry.setFromPoints(vertices);
      let material = this.getLineMaterial(coordinates, properties);
      line = new THREE.Line(geometry, material);
    }
    else
    {
      let material = this.getMeshMaterial(coordinates, properties);
      material.side = THREE.DoubleSide;
      try
      {
        line = this.createTube(vertices, diameter, 16, offset, material);
      }
      catch (ex)
      {
        console.warn("GisLoader: " + ex);
      }
    }
    if (line)
    {
      this.setObjectProperties(line, name, properties);
      parent.add(line);
    }
  }

  createMultiLineString(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    for (var i = 0; i < coordinates.length; i++)
    {
      let polygonCoords = coordinates[i];
      this.createLineString(name + "_" + i, polygonCoords, null, group);
    }
    this.setObjectProperties(group, name, properties);
    parent.add(group);
  }

  createPolygon(name, coordinates, properties, parent)
  {
    let offset = this.getOffset(coordinates, properties);
    let extrusion = this.evalExpression(
      this.options.extrusion, coordinates, properties) || 1;

    let pts = [];

    let outerRing = coordinates[0];
    for (let p = 0; p < outerRing.length - 1; p++)
    {
      let point = outerRing[p];
      pts.push(new THREE.Vector2(point[0] + offset.x, point[1] + offset.y));
    }

    let shape = new THREE.Shape(pts);

    // holes
    let holes = shape.holes;
    for (let r = 1; r < coordinates.length; r++)
    {
      let innerRing = coordinates[r];
      pts = [];
      for (let p = 0; p < innerRing.length - 1; p++)
      {
        let point = innerRing[p];
        pts.push(new THREE.Vector2(point[0] + offset.x, point[1] + offset.y));
      }
      holes.push(new THREE.Shape(pts));
    }

    let solid = new Solid();
    solid.material = this.getMeshMaterial(coordinates, properties);
    let profile = new Profile(new ProfileGeometry(shape));
    solid.add(profile);
    solid.builder = new Extruder(extrusion);
    ObjectBuilder.build(solid);

    solid.position.z = offset.z;
    this.setObjectProperties(solid, name, properties);

    parent.add(solid);
  }

  createMultiPolygon(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    for (let i = 0; i < coordinates.length; i++)
    {
      let polygonCoords = coordinates[i];
      this.createPolygon(name + "_" + i, polygonCoords, null, group);
    }
    this.setObjectProperties(group, name, properties);
    parent.add(group);
  }

  getMeshMaterial(coordinates, properties)
  {
    let color = this.readColor(coordinates, properties) || 0x808080;
    let material = this.meshMaterials[color];
    if (!material)
    {
      material = new THREE.MeshPhongMaterial({color: color});
      this.meshMaterials[color] = material;
    }
    return material;
  }

  getLineMaterial(coordinates, properties)
  {
    let color = this.readColor(coordinates, properties) || 0x0;
    let material = this.lineMaterials[color];
    if (!material)
    {
      material = new THREE.LineBasicMaterial({color: color});
      this.lineMaterials[color] = material;
    }
    return material;
  }

  readColor(coordinates, properties)
  {
    let color = this.evalExpression(this.options.color, coordinates, properties);
    if (typeof color === "number")
    {
      return color;
    }
    else if (typeof color === "string")
    {
      if (color.length === 7 && color[0] === '#')
        return parseInt(color.substring(1), 16);
      else
        return parseInt(color);
    }
    return null;
  }

  getOffset(coordinates, properties)
  {
    let offset = this.offset;

    offset.x =  this.options.offsetX ?
      this.evalExpression(this.options.offsetX, coordinates, properties) :
      -this.origin.x;

    offset.y =  this.options.offsetY ?
      this.evalExpression(this.options.offsetY, coordinates, properties) :
      -this.origin.y;

    offset.z =  this.options.offsetZ ?
      this.evalExpression(this.options.offsetZ, coordinates, properties) :
      -this.origin.z;

    return offset;
  }

  evalExpression(expression, coordinates, properties)
  {
    let result = null;
    if (expression)
    {
      //eval("var $C = coordinates; var $P = properties;");
      try
      {
//        result = eval(expression);
      }
      catch (ex)
      {

      }
    }
    return result;
  }

  createTube(vertices, diameter = 0.25, sides = 8, offset, material)
  {
    const circle = [];
    const angle = 2 * Math.PI / sides;
    for (let i = 0; i < sides; i++)
    {
      let x = Math.cos(angle * i) * diameter;
      let y = Math.sin(angle * i) * diameter;
      circle.push(new THREE.Vector2(x, y));
    }
    let solid = new Solid();
    solid.position.z = offset.z;
    solid.material = material;

    let shape = new THREE.Shape(circle);
    let profile = new Profile(new ProfileGeometry(shape));
    solid.add(profile);

    let cord = new Cord(new CordGeometry(vertices));
    solid.add(cord);

    solid.builder = new Extruder();
    ObjectBuilder.build(solid);

    return solid;
  }
};

class GISModelLoader extends THREE.Loader
{
  constructor(modelURL)
  {
    this.modelURL = modelURL;
    this.listeners = [];
  }

  load(onModelLoad)
  {
    const loader = new ColladaLoader();
    const modelURL = this.modelURL;
    console.info("Loading model " + modelURL);
    loader.load(this.modelURL, model =>
    {
      for (let listener of this.listeners)
      {
        listener(model); // object creation
      }
      onModelLoad(modelURL, model);
    });
  }
}

export { GISLoader, GISModelLoader };
