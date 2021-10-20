/**
 * BRFLoader.js
 *
 * @author realor
 */
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { Formula } from "../formula/Formula.js";
import { Controller } from "../controllers/Controller.js";
import * as THREE from "../lib/three.module.js";

class BRFLoader extends THREE.Loader
{
  constructor()
  {
    super();
  }

  load(url, onLoad, onProgress, onError)
  {
		const loader = new FileLoader(this.manager);
		loader.setPath(this.path);
		loader.setRequestHeader(this.requestHeader);
		loader.setWithCredentials(this.withCredentials);
		loader.load(url, text =>
    {
			try
      {
				onLoad(this.parse(text));
			}
      catch (ex)
      {
				if (onError)
        {
					onError(ex);
				}
        else
        {
					console.error(ex);
				}
				this.manager.itemError(url);
			}
		}, onProgress, onError);
  }

  parse(text)
  {
    let model = JSON.parse(text);

    // parse geometries
    const geometries = model.geometries;
    for (let id in geometries)
    {
      let entry = geometries[id];
      entry._geometry = this.parseGeometry(entry);
    }

    // parse materials
    const materials = model.materials;
    for (let id in materials)
    {
      let entry = materials[id];
      entry._material = this.parseMaterial(entry);
    }

    // parse objects
    const objects = model.objects;
    for (let id in objects)
    {
      let entry = objects[id];
      entry._object = this.parseObject(entry, model);
    }

    // build object tree and create object builders and controllers
    for (let id in objects)
    {
      let entry = objects[id];
      let object = entry._object;
      if (entry.children)
      {
        for (let child of entry.children)
        {
          object.add(model.objects[child.id]._object);
        }
      }
      if (entry.builder)
      {
        this.parseBuilder(entry, model);
      }
      if (entry.controllers)
      {
        this.parseControllers(entry, model);
      }
    }

    // restore formulas
    for (let id in objects)
    {
      let entry = objects[id];
      let object = entry._object;

      const formulas = entry.formulas;
      if (formulas)
      {
        for (let path in formulas)
        {
          let expression = formulas[path];
          Formula.set(object, path, expression);
        }
      }
    }

    // build scene
    const root = model.objects[model.root.id]._object;
    root.updateMatrixWorld();
    ObjectBuilder.build(root);
    return root;
  }

  parseGeometry(entry)
  {
    let geometry = null;

    if (entry.type === "SolidGeometry")
    {
      geometry = new SolidGeometry();
      geometry.isManifold = entry.isManifold;

      for (let vertex of entry.vertices)
      {
        let position = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
        geometry.vertices.push(position);
      }
      for (let face of entry.faces)
      {
        geometry.addFace(...face);
      }
      geometry.updateFaceNormals();
    }
    else if (entry.type === "CordGeometry")
    {
      const points = [];
      for (let point of entry.points)
      {
        let position = new THREE.Vector3(point.x, point.y, point.z);
        points.push(position);
      }
      geometry = new CordGeometry(points);
    }
    else if (entry.type === "ProfileGeometry")
    {
      const path = entry.isClosed ? new THREE.Shape() : new THREE.Path();
      const points = [];
      for (let point of entry.points)
      {
        let position = new THREE.Vector2(point.x, point.y);
        points.push(position);
      }
      path.setFromPoints(points);
      if (entry.isClosed)
      {
        for (let hole of entry.holes)
        {
          let holePoints = [];
          for (let point of hole)
          {
            let position = new THREE.Vector2(point.x, point.y);
            holePoints.push(position);
          }
          let holePath = new THREE.Path();
          holePath.setFromPoints(holePoints);
          path.holes.push(holePath);
        }
      }
      geometry = new ProfileGeometry(path);
    }
    else if (entry.type === "BufferGeometry")
    {
      geometry = new THREE.BufferGeometry();
      for (let name in entry.attributes)
      {
        let attribute = entry.attributes[name];
        let array = attribute.array;
        let itemSize = attribute.itemSize;
        let normalized = attribute.normalized;
        let typedArray;
        switch (attribute.arrayType)
        {
          case "Float32Array" :
            typedArray = new Float32Array(array);
            break;
          case "Uint32Array" :
            typedArray = new Uint32Array(array);
            break;
          case "Uint16Array" :
            typedArray = new Uint16Array(array);
            break;
          default:
            throw "Unsupported TypedArray: " + attribute.arrayType;
        }
        let bufferAttribute =
          new THREE.BufferAttribute(typedArray, itemSize, normalized);
        geometry.setAttribute(name, bufferAttribute);
      }
    }
    return geometry;
  }

  parseMaterial(entry)
  {
    let material = new THREE[entry.type];
    material.name = entry.name;
    material.opacity = entry.opacity;
    material.transparent = entry.transparent;
    material.side = entry.side;

    if (entry.color)
    {
      material.color.set(entry.color);
    }

    if (material instanceof THREE.MeshPhongMaterial)
    {
      material.shininess = entry.shininess;
      material.reflectivity = entry.reflectivity;
      material.specular.set(entry.specular);
      material.emissive.set(entry.emissive);
    }
    return material;
  }

  parseObject(entry, model)
  {
    let object = null;

    if (entry.type === "Object3D")
    {
      object = new THREE.Object3D();
    }
    else if (entry.type === "Group")
    {
      object = new THREE.Group();
    }
    else if (entry.type === "Solid")
    {
      object = new Solid();
      object.edgesVisible = entry.edgesVisible;
      object.facesVisible = entry.facesVisible;
    }
    else if (entry.type === "Profile")
    {
      object = new Profile();
    }
    else if (entry.type === "Cord")
    {
      object = new Cord();
    }
    else if (entry.type === "Mesh")
    {
      object = new THREE.Mesh();
    }
    object.name = entry.name;
    object.visible = entry.visible;

    let position = entry.position;
    if (position)
    {
      object.position.set(position.x, position.y, position.z);
    }

    let rotation = entry.rotation;
    if (rotation)
    {
      object.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    let scale = entry.scale;
    if (scale)
    {
      object.scale.set(scale.x, scale.y, scale.z);
    }
    object.updateMatrix();

    const geometries = model.geometries;
    if (entry.geometry && geometries[entry.geometry.id])
    {
      let geometry = geometries[entry.geometry.id]._geometry;
      if (geometry instanceof SolidGeometry)
      {
        object.updateGeometry(geometry, false);
      }
      else if (geometry instanceof THREE.BufferGeometry)
      {
        object.geometry = geometry;
      }
    }

    const materials = model.materials;
    if (entry.material && materials[entry.material.id])
    {
      let material = materials[entry.material.id]._material;
      if (material)
      {
        object.material = material;
      }
    }

    if (entry.userData)
    {
      object.userData = entry.userData;
    }

    return object;
  }

  parseBuilder(entry, model)
  {
    if (entry.builder)
    {
      const cls = ObjectBuilder.classes[entry.builder.type];
      if (cls)
      {
        const builder = new cls();
        const object = entry._object;
        object.builder = builder;

        this.setProperties(builder, entry.builder, model);
      }
    }
  }

  parseControllers(entry, model)
  {
    let controllerEntries = entry.controllers;
    if (controllerEntries)
    {
      const object = entry._object;
      object.controllers = {};
      for (let name in controllerEntries)
      {
        let controllerEntry = controllerEntries[name];
        let controllerClass = Controller.classes[controllerEntry.type];
        if (controllerClass)
        {
          let controller = new controllerClass(object, name);
          object.controllers[name] = controller;
          this.setProperties(controller, controllerEntry, model);
        }
      }
    }
  }

  setProperties(element, entry, model)
  {
    for (let property in entry)
    {
      if (property !== "type")
      {
        let value = entry[property];
        this.setPropertyValue(element, property, value, model);
      }
    }
  }

  setPropertyValue(element, property, value, model)
  {
    let type = typeof value;
    if (typeof value === "object")
    {
      type = value.type;
      if (type === undefined)
      {
        type = typeof value.z === "number" ? "Vector3" : "Vector2";
      }
    }

    switch (type)
    {
      case "number":
      case "string":
      case "boolean":
        element[property] = value;
        break;
      case "Vector3":
      case "Euler":
        element[property].set(value.x, value.y, value.z);
        break;
      case "Vector2":
        element[property].set(value.x, value.y);
        break;
      case "#object":
        if (model.objects[value.id])
          element[property] = model.objects[value.id]._object;
        break;
      case "#geometry":
        if (model.geometries[value.id])
          element[property] = model.geometries[value.id]._geometry;
        break;
      case "#material":
        if (model.materials[value.id])
          element[property] = model.materials[value.id]._material;
        break;
    }
  }
}

export { BRFLoader };
