/**
 * GISLoader.js
 *
 * @author realor
 */

import { SolidGeometry } from "../../solid/SolidGeometry.js";
import { Solid } from "../../solid/Solid.js";
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
    let modelURL = this.evalExpression(this.options.model, coordinates, properties);
    let offset = this.getOffset(coordinates, properties);
    let rotationZ = this.evalExpression(this.options.rotationZ, coordinates, properties) || 0;

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
        object.position.z = coordinates[2] + offset.z;
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
      object.position.z = coordinates[2] + offset.z;

      this.setObjectProperties(object, name, properties);
      parent.add(object);
    }
  }

  createMultiPoint(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    for (var i = 0; i < coordinates.length; i++)
    {
      var polygonCoords = coordinates[i];
      this.createPoint(name + "_" + i, polygonCoords, null, group);
    }
    this.setObjectProperties(group, name, properties);
    parent.add(group);
  }

  createLineString(name, coordinates, properties, parent)
  {
    let offset = this.getOffset(coordinates, properties);
    let diameter = this.evalExpression(this.options.diameter, coordinates, properties) || 0.25;

    let line = null;
    if (diameter === 0)
    {
      let geometry = new THREE.BufferGeometry();
      let vertices = [];
      for (var i = 0; i < coordinates.length; i++)
      {
        let point = coordinates[i];
        let v = new THREE.Vector3(
          point[0] + offset.x,
          point[1] + offset.y,
          point[2] + offset.z);
        vertices.push(v);
      }
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
        line = this.createTube(coordinates, diameter, 16, offset, material);
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
    let extrusion = this.evalExpression(this.options.extrusion, coordinates, properties) || 0;

    let extrudeSettings = {
     amount : extrusion,
     bevelEnabled	: false
    };
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

    let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    let material = this.getMeshMaterial(coordinates, properties);

    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = offset.z;
    this.setObjectProperties(mesh, name, properties);

    if (this.options.edges)
    {
      let group = new THREE.Group();
      group.add(mesh);
      group.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({color: this.selectionMaterial.color})));
      parent.add(group);
    }
    else
    {
      parent.add(mesh);
    }
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

  createTube(coordinates, diameter, sides, offset, material)
  {
    let getPlane = function(v1, v2, point)
    {
      let normal = new THREE.Vector3();
      if (Math.abs(v1.dot(v2)) > 0.9999)
      {
        normal = v1;
      }
      else
      {
        let s = new THREE.Vector3();
        s.subVectors(v2, v1).normalize();
        let v = new THREE.Vector3();
        v.crossVectors(s, v1).normalize();
        normal.crossVectors(s, v).normalize();
      }
      let plane = new THREE.Plane();
      plane.setFromNormalAndCoplanarPoint(normal, point);
      return plane;
    };

    if (sides < 3) sides = 3;

    const matrix = new THREE.Matrix4();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const vs = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const vx = new THREE.Vector3();
    const vy = new THREE.Vector3();
    const vz = new THREE.Vector3();
    const ray = new THREE.Ray();
    const vertices = [];
    const faces = [];
    const ring = [];
    const points = [];
    let point;
    for (let i = 0; i < coordinates.length; i++)
    {
      point = new THREE.Vector3();
      let icoords = coordinates[i];
      point.x = icoords[0] + offset.x;
      point.y = icoords[1] + offset.y;
      point.z = icoords[2] + offset.z;
      points.push(point);
    }
    // add fake point to generate last ring
    let length = points.length;
    vs.subVectors(points[length - 1], points[length - 2]);
    point = new THREE.Vector3();
    point.copy(points[length - 1]).add(vs);
    points.push(point);

    p1.copy(points[0]);
    p2.copy(points[1]);
    vs.subVectors(p2, p1);
    vy.copy(vs).normalize();
    if (vy.y !== 0) vx.set(-vy.y, vy.x, 0);
    else if (vy.x !== 0) vx.set(vy.y, -vy.x, 0);
    else vx.set(1, 0, 0);
    vz.crossVectors(vx, vy);
		matrix.set(
		  vx.x, vy.x, vz.x, p1.x,
			vx.y, vy.y, vz.y, p1.y,
			vx.z, vy.z, vz.z, p1.z,
			0, 0, 0, 1);

    // initial ring
    for (let s = 0; s < sides; s++)
    {
      let angle = s * (2 * Math.PI / sides);
      let x = Math.cos(angle) * diameter;
      let y = Math.sin(angle) * diameter;
      let vertex = new THREE.Vector3(x, 0, y);
      vertex.applyMatrix4(matrix);
      vertices.push(vertex);
      let ringVertex = new THREE.Vector3();
      ringVertex.copy(vertex);
      ring.push(ringVertex);
    }

    let geometry = new SolidGeometry();
    geometry.vertices = vertices;

    // internal vertices
    for (let i = 1; i < points.length - 1; i++)
    {
      p1.copy(points[i - 1]);
      p2.copy(points[i]);
      p3.copy(points[i + 1]);

      v1.subVectors(p2, p1).normalize();
      v2.subVectors(p3, p2).normalize();
      let plane = getPlane(v1, v2, p2);
      for (let s = 0; s < sides; s++)
      {
        ray.set(ring[s], v1);
        let vertex = ray.intersectPlane(plane);
        if (!vertex) throw "Can't create tube for this LineString";
        vertices.push(vertex);
        ring[s].copy(vertex);
      }
      for (let s = 0; s < sides; s++)
      {
        let base = (i - 1) * sides;
        let a = base + s;
        let b = base + ((s + 1) % sides);
        let c = base + s + sides;
        let d = base + ((s + 1) % sides) + sides;

        geometry.addFace(vertices[a], vertices[d], vertices[d]);
        geometry.addFace(vertices[a], vertices[c], vertices[b]);
      }
    }
    geometry.update();

    return new Solid(geometry, material);
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
