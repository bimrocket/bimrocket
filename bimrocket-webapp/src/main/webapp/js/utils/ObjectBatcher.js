/*
 * ObjectBatcher.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class ObjectBatcher
{
  constructor()
  {
    this.blocks = new Map(); // Material uuid => Block
    this.lines = [];
    this.vector = new THREE.Vector3();
  }

  batch(object)
  {
    this.blocks.clear();
    this.lines = [];

    this.collectStats(object);

    this.addGeometry(object, object.matrix);

    return this.createGroup();
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

  addGeometry(object)
  {
    if (!object.visible) return;

    const vector = this.vector;

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
          this.lines.push(vector.x, vector.y, vector.z);
        }
      }
    }
    else
    {
      for (let child of object.children)
      {
        this.addGeometry(child);
      }
    }
  }

  createGroup()
  {
    const group = new THREE.Group();
    group.name = "batch";

    /* meshes */
    for (let material of this.blocks.keys())
    {
      let block = this.blocks.get(material);
      group.add(block.mesh);
    }
    group.updateMatrix();


    /* lines */
    const linesGeometry = new THREE.BufferGeometry();

    linesGeometry.setAttribute("position",
      new THREE.Float32BufferAttribute(this.lines, 3));

    const lines = new THREE.LineSegments(linesGeometry, Solid.EdgeMaterial);
    lines.name = "edges";
    lines.raycast = function(){};
    ObjectUtils.setSelectionHighlight(lines, ObjectUtils.HIGHLIGHT_NONE);

    group.add(lines);

    return group;
  }

  getBlock(material, create = false)
  {
    let block = this.blocks.get(material);
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
      this.blocks.set(material, block);
    }
    return block;
  }
}

window.ObjectBatcher = ObjectBatcher;

export { ObjectBatcher };