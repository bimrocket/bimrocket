/**
 * BRFLoader.js
 *
 * @author realor
 */
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { Text2D } from "../core/Text2D.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { SolidOptimizer } from "../core/SolidOptimizer.js";
import { ObjectBuilder } from "../builders/ObjectBuilder.js";
import { Formula } from "../formula/Formula.js";
import { Controller } from "../controllers/Controller.js";
import * as THREE from "three";

class BRFLoader extends THREE.Loader
{
  constructor(manager)
  {
    super(manager);

    this.options = {};
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
      entry._geometry = this.parseGeometry(entry, model);
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
      if (entry.links)
      {
        this.parseLinks(entry, model);
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
          try
          {
            Formula.create(object, path, expression);
          }
          catch (ex)
          {
            console.warn("Error evaluating formula: " +
              object.name + "/" + path);
          }
        }
      }
    }

    // build scene
    const root = model.objects[model.root.id]._object;
    root.updateMatrixWorld();
    ObjectBuilder.build(root);
    return root;
  }

  parseGeometry(entry, model)
  {
    let geometry = null;

    if (entry.type === "SolidGeometry")
    {
      geometry = new SolidGeometry();
      geometry.isManifold = entry.isManifold;
      geometry.smoothAngle = entry.smoothAngle || 0;

      for (let vertex of entry.vertices)
      {
        let position = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
        geometry.vertices.push(position);
      }
      for (let loops of entry.faces)
      {
        if (Array.isArray(loops))
        {
          var outerLoop = loops[0];
          if (Array.isArray(outerLoop))
          {
            let face = geometry.addFace(...outerLoop);
            for (let h = 1; h < loops.length; h++)
            {
              face.addHole(...loops[h]);
            }
          }
          else
          {
            // no holes, loops is outerLoop
            outerLoop = loops;
            geometry.addFace(...outerLoop);
          }
        }
      }
      geometry.updateFaceNormals();
      if (model.metadata.version < 2)
      {
        const optimizer = new SolidOptimizer(geometry);
        geometry = optimizer.optimize();
      }
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
        let array = this.parseBufferAttributeArray(attribute);

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
          case "Uint8Array" :
            typedArray = new Uint8Array(array);
            break;
          default:
            throw "Unsupported TypedArray: " + attribute.arrayType;
        }
        let bufferAttribute =
          new THREE.BufferAttribute(typedArray, itemSize, normalized);

        if (name === "index")
        {
          geometry.setIndex(bufferAttribute);
        }
        else
        {
          geometry.setAttribute(name, bufferAttribute);
        }
      }
    }
    return geometry;
  }

  parseMaterial(entry)
  {
    let material = null;

    try
    {
      material = new THREE[entry.type];
    }
    catch (ex)
    {
      console.warn("Unsupported material type: " + entry.type);
      return null;
    }

    this.setProperties(material, entry);

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
    else if (entry.type === "Line")
    {
      object = new THREE.Line();
    }
    else if (entry.type === "LineSegments")
    {
      object = new THREE.LineSegments();
    }
    else if (entry.type === "Sprite")
    {
      object = new THREE.Sprite();
    }
    else if (entry.type === "Points")
    {
      object = new THREE.Points();
    }
    else if (entry.type === "PerspectiveCamera")
    {
      object = new THREE.PerspectiveCamera(entry.fov, entry.aspect,
        entry.near, entry.far);
      if (typeof entry.zoom === "number")
      {
        object.zoom = entry.zoom;
      }
    }
    else if (entry.type === "OrthographicCamera")
    {
      object = new THREE.OrthographicCamera(entry.left, entry.right,
        entry.top, entry.bottom, entry.near, entry.far);
      if (typeof entry.zoom === "number")
      {
        object.zoom = entry.zoom;
      }
    }
    else if (entry.type === "AmbientLight")
    {
      object = new THREE.AmbientLight(entry.color, entry.intensity);
    }
    else if (entry.type === "HemisphereLight")
    {
      object = new THREE.HemisphereLight(entry.color,
        entry.groundColor, entry.intensity);
    }
    else if (entry.type === "DirectionalLight")
    {
      object = new THREE.DirectionalLight(entry.color, entry.intensity);
    }
    else if (entry.type === "PointLight")
    {
      object = new THREE.PointLight(entry.color, entry.intensity,
        entry.distance, entry.decay);
    }
    else if (entry.type === "SpotLight")
    {
      object = new THREE.SpotLight(entry.color, entry.intensity,
        entry.distance, entry.angle, entry.penumbra, entry.decay);
    }
    else if (entry.type === "Text2D")
    {
      object = new Text2D();
      object.text = entry.text;
      object.color = entry.color;
      object.backgroundColor = entry.backgroundColor;
      object.fontSize = entry.fontSize;
      object.maxWidth = entry.maxWidth;
      object.minDistance = entry.minDistance;
      object.maxDistance = entry.maxDistance;
    }
    else
    {
      object = new THREE.Object3D();
      console.warn("Unsupported object type: " + entry.type);
    }

    object.name = entry.name;
    object.visible = entry.visible;
    object.castShadow = entry.castShadow || false;
    object.receiveShadow = entry.receiveShadow || false;

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

    if (!(object instanceof THREE.Sprite))
    {
      const geometries = model.geometries;
      if (entry.geometry && geometries[entry.geometry.id])
      {
        let geometry = geometries[entry.geometry.id]._geometry;
        if (geometry instanceof SolidGeometry)
        {
          object.updateGeometry(geometry);
        }
        else if (geometry instanceof THREE.BufferGeometry)
        {
          object.geometry = geometry;
        }
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

  parseLinks(entry, model)
  {
    let linkEntries = entry.links;
    if (linkEntries)
    {
      const object = entry._object;
      object.links = {};
      for (let name in linkEntries)
      {
        this.setPropertyValue(object.links, name, linkEntries[name], model);
      }
    }
  }

  setProperties(element, entry, model)
  {
    for (let property in entry)
    {
      if (property !== "type" && property !== "id" && property !== "uuid")
      {
        if (property in element && !property.startsWith("_"))
        {
          let value = entry[property];
          this.setPropertyValue(element, property, value, model);
        }
      }
    }
  }

  setPropertyValue(element, property, value, model)
  {
    let type = typeof value;
    if (type === "object")
    {
      if (value)
      {
        type = value.type;
        if (type === undefined)
        {
          // when type is undefined assume Vector3/Vector2
          type = typeof value.z === "number" ? "Vector3" : "Vector2";
        }
      }
      else type = null;
    }

    let actualValue = element[property];
    let actualType = typeof actualValue;
    if (actualType === "object")
    {
      if (actualValue === null || actualValue === undefined)
      {
        actualType = null;
      }
      else
      {
        actualType = actualValue.constructor.name;
      }
    }

    if (actualType === "string")
    {
      element[property] = value === null || value === undefined ?
        "" : String(value);
    }
    else if (actualType === "number" && type === "number")
    {
      element[property] = value;
    }
    else if (actualType === "boolean" && type === "boolean")
    {
      element[property] = value;
    }
    else if (actualType === "Vector3" && type === "Vector3")
    {
      element[property].set(value.x, value.y, value.z);
    }
    else if (actualType === "Vector2" && type === "Vector2")
    {
      element[property].set(value.x, value.y);
    }
    else if (actualType === "Euler" && type === "Euler")
    {
      element[property].set(value.x, value.y, value.z);
    }
    else if (actualType === "Color")
    {
      if (type === "string")
      {
        element[property].set(value);
      }
      else if (type === "Color")
      {
        element[property].set(value.r, value.g, value.b);
      }
    }
    else if (actualType === "Array")
    {
      element[property] = value;
    }
    else if (type === "#object")
    {
      let entry = model.objects[value.id];
      if (entry && entry._object)
      {
        element[property] = entry._object;
      }
    }
    else if (type === "#geometry")
    {
      let entry = model.geometries[value.id];
      if (entry && entry._geometry)
      {
        element[property] = entry._geometry;
      }
    }
    else if (type === "#material")
    {
      let entry = model.materials[value.id];
      if (entry && entry._material)
      {
        element[property] = entry._material;
      }
    }
    else if (type === "Texture" && element instanceof THREE.Material)
    {
      const textureLoader = new THREE.TextureLoader(this.manager);
      const texture = textureLoader.load(value.image);
      element[property] = texture;
      element.needsUpdate = true;
    }
    else if (value === null)
    {
      element[property] = null;
    }
    else if (actualType === null)
    {
      element[property] = value;
    }
    else
    {
      console.warn("Invalid value for property [" + property + "]: " + value +
        " (expect " + actualType + " but found " + type + ")");
    }
  }

  parseBufferAttributeArray(attribute)
  {
    let array = attribute.array;

    if (array.length === 0) return array;

    if (array[0] instanceof Array) // compressed attribute
    {
      let uncompressedArray = [];
      for (let i = 0; i < array.length; i++)
      {
        let item = array[i];
        if (item instanceof Array)
        {
          uncompressedArray.push(...item);
        }
        else if (typeof item === "number")
        {
          uncompressedArray.push(...array[item]);
        }
      }
      return uncompressedArray;
    }
    else return array;
  }
}

export { BRFLoader };
