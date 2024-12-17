/*
 * ObjectBatcher.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Solid } from "../core/Solid.js";
import * as THREE from "three";

class ObjectBatcher
{
  constructor()
  {
    this.maxLinesLength = 3 * 1024 * 1024;
    this._blocks = new Map(); // Material uuid => Block
    this._lines = [];
    this._vector = new THREE.Vector3();
  }

  batch(object)
  {
    this._blocks.clear();
    this._lines = [];

    this.collectStats(object);

    const group = new THREE.Group();
    group.name = "batch";

    this.addGeometry(object, group);
    
    if (this._lines.length > 0)
    {
      this.addLineSegments(group);
    }

    group.updateMatrix();
    
    return group;
  }

  collectStats(object)
  {
    if (!object.visible) return;

    if (object instanceof THREE.Mesh)
    {
      const material = object.material;
      const geometry = object.geometry;
      const position = geometry.attributes.position;

      if (position && material)
      {
        const block = this.getBlock(material, true);

        block.instances++;
        if (!block.geometries.has(geometry.uuid))
        {
          block.geometries.set(geometry.uuid, false);
          block.vertices += position.count;
          let index = geometry.getIndex();
          if (index !== null)
          {
            block.indices += index.count;
          }
        }
        if (object.castShadow)
        {
          block.castShadow = true;
        }
        if (object.receiveShadow)
        {
          block.receiveShadow = true;
        }
      }
    }
    else
    {
      for (let child of object.children)
      {
        this.collectStats(child);
      }
    }
  }

  addGeometry(object, group)
  {
    if (!object.visible) return;

    const vector = this._vector;

    if (object instanceof THREE.Mesh)
    {
      const material = object.material;
      const geometry = object.geometry;
      const position = geometry.attributes.position;

      if (position && material)
      {
        const block = this.getBlock(material);
        if (block)
        {
          if (block.mesh === null)
          {
            block.mesh = new THREE.BatchedMesh(
              block.instances, block.vertices, block.indices, material);
            block.mesh.name = (material.name || "?").replaceAll(".", "_");
            block.mesh.raycast = () => {};
            block.mesh.castShadow = block.castShadow;
            block.mesh.receiveShadow = block.receiveShadow;
            ObjectUtils.setSelectionHighlight(block.mesh, ObjectUtils.HIGHLIGHT_NONE);
            group.add(block.mesh);
          }

          // add geometry
          let geometryId = block.geometries.get(geometry.uuid);
          if (geometryId === false)
          {
            geometryId = block.mesh.addGeometry(geometry);
            block.geometries.set(geometry.uuid, geometryId);
          }

          // add instance
          let instanceId = block.mesh.addInstance(geometryId);
          block.mesh.setMatrixAt(instanceId, object.matrixWorld);
        }
      }
    }
    else if (object instanceof THREE.LineSegments)
    {
      const geometry = object.geometry;
      if (geometry.attributes?.position)
      {
        const array = geometry.attributes.position.array;
        for (let i = 0; i < array.length; i += 3)
        {
          vector.set(array[i], array[i + 1], array[i + 2]);
          vector.applyMatrix4(object.matrixWorld);
          this._lines.push(vector.x, vector.y, vector.z);
        }
        if (this._lines.length > this.maxLinesLength)
        {
          this.addLineSegments(group);
        }
      }
    }
    else
    {
      for (let child of object.children)
      {
        this.addGeometry(child, group);
      }
    }
  }

  addLineSegments(group)
  {
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute("position",
      new THREE.Float32BufferAttribute(this._lines, 3));

    const lineSegments = new THREE.LineSegments(linesGeometry, Solid.EdgeMaterial);
    lineSegments.name = "edges";
    lineSegments.raycast = function(){};
    ObjectUtils.setSelectionHighlight(lineSegments, ObjectUtils.HIGHLIGHT_NONE);      
    group.add(lineSegments);  
    this._lines = [];
  }

  getBlock(material, create = false)
  {
    let block = this._blocks.get(material);
    if (block === undefined && create)
    {
      block = {
        instances: 0,
        vertices: 0,
        indices: 0,
        castShadow: false,
        receiveShadow: false,
        geometries : new Map(), // BufferGeometry uuid => id
        mesh: null // BatchedMesh
      };
      this._blocks.set(material, block);
    }
    return block;
  }
}

window.ObjectBatcher = ObjectBatcher;

export { ObjectBatcher };