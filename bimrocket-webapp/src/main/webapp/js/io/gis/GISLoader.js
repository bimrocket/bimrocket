/**
 * GISLoader.js
 *
 * @author realor
 */

import { Profile } from "../../core/Profile.js";
import { ProfileGeometry } from "../../core/ProfileGeometry.js";
import { Cord } from "../../core/Cord.js";
import { CordGeometry } from "../../core/CordGeometry.js";
import * as THREE from "../../lib/three.module.js";

class GISLoader extends THREE.Loader
{
  constructor(manager, mimeType)
  {
    super(manager);
    this.options = {};
    this.mimeType = mimeType;
    this.origin = new THREE.Vector3();
    /* default material for Cords and Profiles */
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x0 });
    this.pointGeometry = null;
    this.pointSize = 1;
  }

  load(url, onLoad, onProgress, onError)
  {
    const options = this.options;
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
    if (this.pointGeometry === null)
    {
      const path = new THREE.Path();
      const radius = 0.5 * this.pointSize;

      path.moveTo(-radius, 0);
      path.lineTo(0, radius);
      path.lineTo(radius, 0);
      path.lineTo(0, -radius);
      path.closePath();
      this.pointGeometry = new ProfileGeometry(path);
    }

    let profile = new Profile(this.pointGeometry, this.lineMaterial);
    profile.name = "Point";
    profile.visible = true;
    profile.position.x = coordinates[0];
    profile.position.y = coordinates[1];
    profile.position.z = coordinates.length === 3 ? coordinates[2] : 0;
    profile.position.sub(this.origin);

    this.setObjectProperties(profile, name, properties);
    parent.add(profile);

    profile.updateMatrix();
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
    ObjectUtils.setSelectionGroup(group, true);
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

    cord.visible = true;
    this.setObjectProperties(cord, name, properties);
    parent.add(cord);

    cord.updateMatrix();
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
    shape.closePath();

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
      let hole = new THREE.Shape(pts);
      hole.closePath();
      holes.push(hole);
    }

    let geometry = new ProfileGeometry(shape);
    let profile = new Profile(geometry, this.lineMaterial);

    profile.visible = true;
    this.setObjectProperties(profile, name, properties);
    parent.add(profile);

    profile.updateMatrix();
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
