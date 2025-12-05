/**
 * GISLoader.js
 *
 * @author realor
 */

import { Profile } from "../../core/Profile.js";
import { ProfileGeometry } from "../../core/ProfileGeometry.js";
import { Cord } from "../../core/Cord.js";
import { CordGeometry } from "../../core/CordGeometry.js";
import * as THREE from "three";

class GISLoader extends THREE.Loader
{
  constructor(manager, mimeType)
  {
    super(manager);
    this.options = {};
    this.mimeType = mimeType;
    this._origin = null;
    /* default material for Cords and Profiles */
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0x0 });
    this.pointGeometry = null;
    this.pointSize = 1;
  }

  load(source, onLoad, onProgress, onError)
  {
    const options = this.options;

    if (source instanceof File)
    {
      if (this.manager) this.manager.itemStart(source.name);
      const reader = new FileReader();
      reader.onload = (event) => 
      {
          this._processData(event.target.result, source.name, onLoad, onError);
      };
      reader.onerror = (event) =>
      {
        if (onError) onError(event);
        if (this.manager) this.manager.itemError(source.name);
      };
      reader.readAsText(source);
    }
    else if (typeof source === 'string')
    {
      const url = source;
      if (this.manager) this.manager.itemStart(url);
      
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
            const data = request.responseXML ? request.responseXML : request.responseText;
            this._processData(data, url, onLoad, onError);
          }
          else
          {
              const error = new Error(`Request failed with status ${request.status}`);
              if (onError) onError(error);
              if (this.manager) this.manager.itemError(url);
          }
        }
      };
      
      if (onProgress)
      {
        request.onprogress = onProgress;
      }
      
      request.send();
    }
    else
    {
      if (onError) onError(new Error("Invalid source"));
    }
  }

  _processData(data, itemName, onLoad, onError)
  {
    try
    {
      const result = this.parse(data);
      Promise.resolve(result).then(featureGroup =>
      {
        if (featureGroup)
        {
          if (onLoad) onLoad(featureGroup);
          if (this.manager) this.manager.itemEnd(itemName);
        }
        else
        {
          const error = new Error("Parsing failed.");
          if (onError) onError(error);
          if (this.manager) this.manager.itemError(itemName);
        }
      }).catch(error =>
      {
        if (onError) onError(error);
        if (this.manager) this.manager.itemError(itemName);
      });
    }
    catch (error)
    {
      if (onError) onError(error);
      if (this.manager) this.manager.itemError(itemName);
    }
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

    const origin = this.getOrigin(coordinates);

    let profile = new Profile(this.pointGeometry, this.lineMaterial);
    profile.name = "Point";
    profile.visible = true;
    profile.position.x = coordinates[0];
    profile.position.y = coordinates[1];
    profile.position.z = coordinates.length === 3 ? coordinates[2] : 0;
    profile.position.sub(origin);

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
    const origin = this.getOrigin(coordinates[0]);

    let vertices = [];
    for (let i = 0; i < coordinates.length; i++)
    {
      let point = coordinates[i];
      let v = new THREE.Vector3(
        point[0],
        point[1],
        point.length === 3 ? point[2] : 0);
      v.sub(origin);
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

    const origin = this.getOrigin(coordinates[0][0]);

    let outerRing = coordinates[0];
    for (let p = 0; p < outerRing.length - 1; p++)
    {
      let point = outerRing[p];
      let v = new THREE.Vector2(point[0], point[1]);
      v.sub(origin);
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
        v.sub(origin);
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

  getOrigin(coordinates = null)
  {
    if (this._origin === null)
    {
      if (coordinates)
      {
        this._origin = new THREE.Vector3(
          coordinates[0],
          coordinates[1],
          coordinates.length === 3 ? coordinates[2] : 0);
      }
      else
      {
        this._origin = new THREE.Vector3();
      }
    }
    return this._origin;
  }
}

export { GISLoader };
