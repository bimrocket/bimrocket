/**
 * GISLoader.js
 *
 * @author realor
 */

import { ObjectBuilder } from "../../builders/ObjectBuilder.js";
import { Solid } from "../../core/Solid.js";
import { SolidGeometry } from "../../core/SolidGeometry.js";
import { Profile } from "../../core/Profile.js";
import { CircleBuilder } from "../../builders/CircleBuilder.js";
import { ProfileGeometry } from "../../core/ProfileGeometry.js";
import { Cord } from "../../core/Cord.js";
import { CordGeometry } from "../../core/CordGeometry.js";
import { Extruder } from "../../builders/Extruder.js";
import { Formula } from "../../formula/Formula.js";
import { ColladaLoader } from "../ColladaLoader.js";
import * as THREE from "../../lib/three.module.js";

class GISLoader extends THREE.Loader
{
  constructor(manager, mimeType)
  {
    super(manager);
    this.options = {};
    this.mimeType = mimeType;
    this.origin = new THREE.Vector3();
    this.materials = new Map();
    /* default material for Cords and Profiles */
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x0 });
  }

  load(url, onLoad, onProgress, onError)
  {
    const options = this.options;
    this.representation = options.representation;
    if (options.origin)
    {
      this.origin.copy(options.origin);
    }

    const request = new XMLHttpRequest();
    request.open("GET", url, true);

    if (options.username && options.password)
    {
      const basicAutho = "Basic " +
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
          let featureGroup = this.parse(request.responseXML ?
            request.responseXML : request.responseText);

          onLoad(featureGroup);
        }
      }
    };
    request.send();
  }

  parse(data) // abstract
  {
  }

  createObject(type, name, coordinates, properties, parent)
  {
    try
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
    catch (ex)
    {
      console.warn(ex);
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
      object.userData.GIS = properties;
    }
  }

  createPoint(name, coordinates, properties, parent)
  {
    let object = null;
    if (this.representation instanceof THREE.Object3D)
    {
      object = this.representation.clone();
      object.userData.selection = { "group" : true };
    }
    else
    {
      // default shape: cylinder
      let profile = new Profile();
      profile.builder = new CircleBuilder(0.5);
      profile.name = "Profile";
      let solid = new Solid();
      solid.add(profile);
      solid.builder = new Extruder(1);
      ObjectBuilder.build(solid);
      object = solid;
    }
    object.visible = true;

    object.position.x = coordinates[0];
    object.position.y = coordinates[1];
    object.position.z = coordinates.length === 3 ? coordinates[2] : 0;
    object.position.sub(this.origin);

    this.setObjectProperties(object, name, properties);
    parent.add(object);

    Formula.updateTree(object);

    ObjectBuilder.build(object);
    object.updateMatrix();
  }

  createMultiPoint(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    this.setObjectProperties(group, name, properties);

    for (let i = 0; i < coordinates.length; i++)
    {
      let pointCoords = coordinates[i];
      this.createPoint(name + "_" + i, pointCoords, null, group);
    }
    group.userData.selection = { "group" : true };
    parent.add(group);
  }

  createLineString(name, coordinates, properties, parent)
  {
    let vertices = [];
    for (let i = 0; i < coordinates.length; i++)
    {
      let point = coordinates[i];
      let v = new THREE.Vector3(
        point[0],
        point[1],
        point.length === 3 ? point[2] : 0);
      v.sub(this.origin);
      vertices.push(v);
    }

    let geometry = new CordGeometry(vertices);
    let cord = new Cord(geometry, this.lineMaterial);
    let solid = null;

    if (this.representation instanceof Solid)
    {
      solid = this.representation.clone();
      solid.add(cord);
      cord.visible = false;
    }

    const object = solid || cord;
    object.visible = true;
    this.setObjectProperties(object, name, properties);
    parent.add(object);

    Formula.updateTree(object);

    ObjectBuilder.build(object);
    object.updateMatrix();
  }

  createMultiLineString(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    this.setObjectProperties(group, name, properties);

    for (let i = 0; i < coordinates.length; i++)
    {
      let polygonCoords = coordinates[i];
      this.createLineString(name + "_" + i, polygonCoords, null, group);
    }
    parent.add(group);
  }

  createPolygon(name, coordinates, properties, parent)
  {
    let pts = [];

    let outerRing = coordinates[0];
    for (let p = 0; p < outerRing.length - 1; p++)
    {
      let point = outerRing[p];
      let v = new THREE.Vector2(point[0], point[1]);
      v.sub(this.origin);
      pts.push(v);
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
        let v = new THREE.Vector2(point[0], point[1]);
        v.sub(this.origin);
        pts.push(v);
      }
      holes.push(new THREE.Shape(pts));
    }

    let geometry = new ProfileGeometry(shape);
    let profile = new Profile(geometry, this.lineMaterial);
    let solid = null;

    if (this.representation instanceof Solid)
    {
      solid = this.representation.clone();
      solid.add(profile);
      profile.visible = false;
    }

    let object = solid || profile;
    object.visible = true;
    this.setObjectProperties(object, name, properties);
    parent.add(object);

    Formula.updateTree(object);

    ObjectBuilder.build(object);
    object.updateMatrix();
  }

  createMultiPolygon(name, coordinates, properties, parent)
  {
    let group = new THREE.Group();
    this.setObjectProperties(group, name, properties);

    for (let i = 0; i < coordinates.length; i++)
    {
      let polygonCoords = coordinates[i];
      this.createPolygon(name + "_" + i, polygonCoords, null, group);
    }
    parent.add(group);
  }
}

export { GISLoader };
