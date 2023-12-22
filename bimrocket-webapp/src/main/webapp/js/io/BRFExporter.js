/**
 * BRFExporter.js
 *
 * @author realor
 */
import { Solid } from "../core/Solid.js";
import { Profile } from "../core/Profile.js";
import { Cord } from "../core/Cord.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { Formula } from "../formula/Formula.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "../lib/three.module.js";

class BRFExporter
{
  static VERSION = 6;

  constructor()
  {
    this.options = {};
  }

  parse(object)
  {
    const dateString = new Date().toISOString();

    let model =
    {
      metadata :
      {
        format : "BIMROCKET FILE (brf)",
        version : BRFExporter.VERSION,
        creation : dateString,
        agent : navigator.userAgent
      },
      geometries : {},
      materials : {},
      objects : {},
      root : { type : "#object", id : String(object.id) }
    };

    this.export(object, model);

    return JSON.stringify(model);
  }

  export(object, model)
  {
    const id = String(object.id);

    let entry = {
      id : id,
      type : object.type,
      name : object.name,
      visible : object.visible,
      castShadow : object.castShadow,
      receiveShadow : object.receiveShadow
    };

    model.objects[id] = entry;

    let position = object.position;
    if (position.x !== 0 || position.y !== 0 || position.z !== 0)
    {
      entry.position = this.exportVector(position);
    }

    let rotation = object.rotation;
    if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0)
    {
      entry.rotation = this.exportEuler(rotation);
    }

    let scale = object.scale;
    if (scale.x !== 1.0 || scale.y !== 1.0 || scale.z !== 1.0)
    {
      entry.scale = this.exportVector(scale);
    }

    if (Object.keys(object.userData).length > 0)
    {
      entry.userData = object.userData;
    }

    if (object instanceof Solid)
    {
      entry.edgesVisible = object.edgesVisible;
      entry.facesVisible = object.facesVisible;
    }
    else if (object instanceof THREE.PerspectiveCamera)
    {
      let camera = object;
      entry.fov = camera.fov;
      entry.aspect = camera.aspect;
      entry.near = camera.near;
      entry.far = camera.far;
      entry.zoom = camera.zoom;
    }
    else if (object instanceof THREE.OrthographicCamera)
    {
      let camera = object;
      entry.left = camera.left;
      entry.right = camera.right;
      entry.top = camera.top;
      entry.bottom = camera.bottom;
      entry.near = camera.near;
      entry.far = camera.far;
      entry.zoom = camera.zoom;
    }
    else if (object instanceof THREE.AmbientLight)
    {
      let light = object;
      entry.color = "#" + light.color.getHexString();
      entry.intensity = light.intensity;
    }
    else if (object instanceof THREE.HemisphereLight)
    {
      let light = object;
      entry.color = "#" + light.color.getHexString();
      entry.groundColor = "#" + light.groundColor.getHexString();
      entry.intensity = light.intensity;
    }
    else if (object instanceof THREE.DirectionalLight)
    {
      let light = object;
      entry.color = "#" + light.color.getHexString();
      entry.intensity = light.intensity;
    }
    else if (object instanceof THREE.PointLight)
    {
      let light = object;
      entry.color = "#" + light.color.getHexString();
      entry.intensity = light.intensity;
      entry.distance = light.distance;
      entry.decay = light.decay;
    }
    else if (object instanceof THREE.SpotLight)
    {
      let light = object;
      entry.color = "#" + light.color.getHexString();
      entry.intensity = light.intensity;
      entry.distance = light.distance;
      entry.angle = light.angle;
      entry.penumbra = light.penumbra;
      entry.decay = light.decay;
    }

    let exportGeometry = Boolean(object.geometry);
    let exportChildren = ObjectUtils.isExportableChildren(object);
    if (object.builder)
    {
      entry.builder = this.exportBuilder(object.builder);
      exportGeometry = exportGeometry
        && !object.builder.isGeometryBuilder(object);
      exportChildren = exportChildren
        && !object.builder.isChildrenBuilder(object);
    }

    let controllers = object.controllers;
    if (controllers)
    {
      entry.controllers = {};
      for (let key in controllers)
      {
        let controller = controllers[key];
        entry.controllers[key] = this.exportController(controller);
      }
    }

    let links = object.links;
    if (links)
    {
      entry.links = {};
      this.exportProperties(links, entry.links);
    }

    let geometry = object.geometry;
    if (geometry && exportGeometry)
    {
      this.exportGeometry(geometry, model);
      entry.geometry = { type : "#geometry", id: String(geometry.id) };
    }

    let material = object.material;
    if (material && material.type)
    {
      this.exportMaterial(material, model);
      entry.material = { type : "#material", id : String(material.id) };
    }

    const formulas = Formula.getAll(object);
    if (formulas)
    {
      entry.formulas = {};
      for (let path in formulas)
      {
        let formula = formulas[path];
        entry.formulas[formula.path] = formula.expression;
      }
    }

    if (exportChildren)
    {
      for (let child of object.children)
      {
        if (ObjectUtils.isExportable(child))
        {
          this.export(child, model);
          if (entry.children === undefined)
          {
            entry.children = [];
          }
          entry.children.push({ type : "#object", id : String(child.id) });
        }
      }
    }
  }

  exportGeometry(geometry, model)
  {
    const id = String(geometry.id);
    if (typeof model.geometries[id] === "undefined")
    {
      let entry =
      {
        id : id
      };

      if (geometry instanceof SolidGeometry)
      {
        entry.type = "SolidGeometry";
        entry.vertices = [];
        for (let vertex of geometry.vertices)
        {
          entry.vertices.push(this.exportVector(vertex));
        }
        entry.faces = [];
        entry.isManifold = geometry.isManifold;
        entry.smoothAngle = geometry.smoothAngle;
        for (let face of geometry.faces)
        {
          if (face.holes.length === 0)
          {
            entry.faces.push(face.indices);
          }
          else
          {
            let loops = [face.indices];
            for (let hole of face.holes)
            {
              loops.push(hole.indices);
            }
            entry.faces.push(loops);
          };
        }
      }
      else if (geometry instanceof ProfileGeometry)
      {
        const path = geometry.path;
        entry.type = "ProfileGeometry";
        entry.isClosed = geometry.isClosed();
        const points = path.getPoints();
        entry.points = [];
        for (let point of points)
        {
          entry.points.push(this.exportVector(point));
        }
        if (path instanceof THREE.Shape)
        {
          entry.holes = [];
          const holes = path.getPointsHoles();
          for (let hole of holes)
          {
            const holePoints = [];
            entry.holes.push(holePoints);
            for (let point of hole)
            {
              holePoints.push(this.exportVector(point));
            }
          }
        }
      }
      else if (geometry instanceof CordGeometry)
      {
        entry.type = "CordGeometry";
        entry.points = [];
        for (let point of geometry.points)
        {
          entry.points.push({ x : point.x, y : point.y, z : point.z });
        }
      }
      else if (geometry instanceof THREE.BufferGeometry)
      {
        entry.type = "BufferGeometry";
        entry.attributes = {};
        const attributes = geometry.attributes;

        const compressionEnabled =
          this.options.enableBufferGeometryCompression === undefined
          || this.options.enableBufferGeometryCompression === true;

        for (let name in attributes)
        {
          let attribute = attributes[name];

          let compress = compressionEnabled && attribute.itemSize > 1 &&
            geometry.getIndex() === undefined;

          entry.attributes[name] =
          {
            type : attribute.constructor.name,
            arrayType : attribute.array.constructor.name,
            itemSize : attribute.itemSize,
            normalized : attribute.normalized,
            array: this.exportBufferAttributeArray(attribute, compress)
          };
        }
        if (geometry.getIndex())
        {
          let attribute = geometry.getIndex();
          entry.attributes["index"] =
          {
            type : attribute.constructor.name,
            arrayType : attribute.array.constructor.name,
            itemSize : attribute.itemSize,
            normalized : attribute.normalized,
            array: this.exportBufferAttributeArray(attribute)
          };
        }
      }
      model.geometries[id] = entry;
    }
  }

  exportMaterial(material, model)
  {
    const id = String(material.id);
    if (typeof model.materials[id] === "undefined")
    {
      let entry = {
        id : id,
        type : material.type,
        name : material.name,
        opacity : material.opacity,
        transparent : material.transparent,
        side : material.side,
        depthTest : material.depthTest,
        depthWrite : material.depthWrite,
        polygonOffset : material.polygonOffset,
        polygonOffsetFactor : material.polygonOffsetFactor,
        polygonOffsetUnits : material.polygonOffsetUnits
      };

      if (material.color)
      {
        entry.color = "#" + material.color.getHexString();
      }

      if (typeof material.flatShading === "boolean")
      {
        entry.flatShading = material.flatShading;
      }

      if (material instanceof THREE.MeshPhongMaterial)
      {
        entry.specular = "#" + material.specular.getHexString();
        entry.emissive = "#" + material.emissive.getHexString();
        entry.shininess = material.shininess;
        entry.reflectivity = material.reflectivity;
      }

      if (material instanceof THREE.SpriteMaterial)
      {
        entry.sizeAttenuation = material.sizeAttenuation;
      }

      if (typeof material.size === "number")
      {
        entry.size = material.size;
      }

      if (typeof material.sizeAttenuation === "boolean")
      {
        entry.sizeAttenuation = material.sizeAttenuation;
      }

      if (material.map)
      {
        entry.map = { "type" : "Texture", "image" : material.map.name };
      }

      model.materials[id] = entry;
    }
  }

  exportBuilder(builder)
  {
    const builderEntry = {};
    builderEntry.type = builder.constructor.name;
    this.exportProperties(builder, builderEntry);
    return builderEntry;
  }

  exportController(controller)
  {
    const controllerEntry = {};
    controllerEntry.type = controller.constructor.name;
    this.exportProperties(controller, controllerEntry, "name", "object");
    return controllerEntry;
  }

  exportProperties(element, entry, ...exclude)
  {
    const properties = Object.keys(element);
    for (let property of properties)
    {
      if (!property.startsWith("_") && !exclude.includes(property))
      {
        let value = element[property];
        let type = typeof value;
        if (type === "number" || type === "string" || type === "boolean")
        {
          entry[property] = value;
        }
        else if (value instanceof THREE.Vector3
                || value instanceof THREE.Vector2)
        {
          entry[property] = this.exportVector(value);
        }
        else if (value instanceof THREE.Euler)
        {
          entry[property] = this.exportEuler(value);
        }
        else if (value instanceof THREE.Color)
        {
          entry[property] = this.exportColor(value);
        }
        else if (value instanceof THREE.Object3D)
        {
          entry[property] = { type: "#object", id : String(value.id) };
        }
      }
    }
    return entry;
  }

  exportVector(vector)
  {
    const v = { x: vector.x, y : vector.y };
    if (vector instanceof THREE.Vector3)
    {
      v.z = vector.z;
    }
    return v;
  }

  exportEuler(euler)
  {
    return { type: "Euler", x : euler.x, y : euler.y, z : euler.z };
  }

  exportColor(color)
  {
    return "#" + color.getHexString();
  }

  exportBufferAttributeArray(attribute, compress = false)
  {
    const itemSize = attribute.itemSize;

    const array = attribute.array;
    const precision7 = array instanceof Float32Array;

    if (compress)
    {
      const compressedArray = [];
      const map = new Map();

      for (let i = 0; i < array.length; i += itemSize)
      {
        let vector = [];
        for (let k = 0; k < itemSize; k++)
        {
          if (precision7)
          {
            vector.push(parseFloat(array[i + k].toPrecision(7)));
          }
          else
          {
            vector.push(array[i + k]);
          }
        }
        let key = vector.join(",");
        let itemIndex = map.get(key);
        if (itemIndex === undefined)
        {
          itemIndex = i / itemSize;
          map.set(key, itemIndex);
          compressedArray.push(vector);
        }
        else
        {
          compressedArray.push(itemIndex);
        }
      }
      return compressedArray;
    }
    else
    {
      if (precision7)
      {
        const directArray = [];

        for (let i = 0; i < array.length; i++)
        {
          directArray.push(parseFloat(array[i].toPrecision(7)));
        }
        return directArray;
      }
      else
      {
        return Array.from(array);
      }
    }
  }
}

export { BRFExporter };
