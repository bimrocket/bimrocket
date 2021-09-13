/**
 * BRFExporter.js
 *
 * @author realor
 */
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import * as THREE from "../lib/three.module.js";

class BRFExporter
{
  static VERSION = 1

  parse(object)
  {
    let model =
    {
      metadata :
      {
        format : "BIMROCKET FILE (brf)",
        version : BRFExporter.VERSION
      },
      geometries : {},
      materials : {},
      objects : {}
    };

    this.export(object, model);

    return JSON.stringify(model, null, 2);
  }

  export(object, model)
  {
    const id = String(object.id);

    let entry = {
      id : id,
      type : object.type,
      name : object.name,
      visible : object.visible
    };

    model.objects[entry.id] = entry;

    if (object.parent)
    {
      const parentId = String(object.parent.id);
      if (typeof model.objects[parentId] !== "undefined")
      {
        entry.parent = parentId;
      }
    }

    let position = object.position;
    if (position.x !== 0 || position.y !== 0 || position.z !== 0)
    {
      entry.position = { x: position.x, y: position.y, z: position.z };
    }

    let rotation = object.rotation;
    if (rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0)
    {
      entry.rotation = { x: rotation.x, y: rotation.y, z: rotation.z };
    }

    let scale = object.scale;
    if (scale.x !== 1.0 || scale.y !== 1.0 || scale.z !== 1.0)
    {
      entry.scale = { x: scale.x, y: scale.y, z: scale.z };
    }

    if (Object.keys(object.userData).length > 0)
    {
      entry.userData = object.userData;
    }

    if (object instanceof Solid)
    {
      let geometry = object.geometry;
      this.exportGeometry(geometry, model);
      entry.geometry = String(geometry.id);
      entry.edgesVisible = object.edgesVisible;
      entry.facesVisible = object.facesVisible;
      entry.operation = object.operation;
    }
    else if (object instanceof THREE.Mesh)
    {
      let geometry = object.geometry;
      this.exportGeometry(geometry, model);
      entry.geometry = String(geometry.id);
    }

    if (object.material)
    {
      let material = object.material;
      this.exportMaterial(material, model);
      entry.material = String(material.id);
    }

    if (object instanceof Solid)
    {
      for (let i = 2; i < object.children.length; i++)
      {
        this.export(object.children[i], model);
      }
    }
    else
    {
      for (let child of object.children)
      {
        this.export(child, model);
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
          entry.vertices.push({ x : vertex.x, y : vertex.y, z : vertex.z });
        }
        entry.faces = [];
        entry.isManifold = geometry.isManifold;
        for (let face of geometry.faces)
        {
          entry.faces.push(face.indices);
        }
      }
      else if (geometry instanceof THREE.BufferGeometry)
      {
        entry.type = "BufferGeometry";
        entry.attributes = {};
        const attributes = geometry.attributes;
        for (let name in attributes)
        {
          let attribute = attributes[name];
          entry.attributes[name] =
          {
            type : attribute.constructor.name,
            arrayType : attribute.array.constructor.name,
            array : Array.from(attribute.array),
            itemSize : attribute.itemSize,
            normalized : attribute.normalized
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
        side : material.side
      };

      if (material.color)
      {
        entry.color = "#" + material.color.getHexString();
      }

      if (material instanceof THREE.MeshPhongMaterial)
      {
        entry.specular = "#" + material.specular.getHexString();
        entry.emissive = "#" + material.emissive.getHexString();
        entry.shininess = material.shininess;
        entry.reflectivity = material.reflectivity;
      }
      model.materials[id] = entry;
    }
  }
}

export { BRFExporter };
