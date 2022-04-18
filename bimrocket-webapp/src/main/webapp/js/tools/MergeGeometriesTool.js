/*
 * MergeGeometriesTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Selection } from "../utils/Selection.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { Solid } from "../core/Solid.js";
import * as THREE from "../lib/three.module.js";

class MergeGeometriesTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "merge_geometries";
    this.label = "tool.merge_geometries.label";
    this.help = "tool.merge_geometries.help";
    this.className = "merge_geometries";
    this.setOptions(options);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const roots = application.selection.roots;
    this.convert(roots);
  }

  convert(roots)
  {
    const application = this.application;
    const parents = new Selection();
    for (let root of roots)
    {
      parents.add(root.parent);
      this.traverse(root);
    }

    const changed = parents.roots;
    application.notifyObjectsChanged(changed, this, "structureChanged");
  }

  traverse(object)
  {
    const materialMap = new Map();

    let children = object.children;
    for (let child of children)
    {
      if (child instanceof THREE.Mesh || child instanceof Solid)
      {
        let material = child.material;
        if (material instanceof THREE.Material)
        {
          let entry = materialMap.get(material);
          if (entry === undefined)
          {
            entry = { material : material, geometries : [], objects : [] };
            materialMap.set(material, entry);
          }
          let geometry = child.geometry.clone().applyMatrix4(child.matrix);
          entry.geometries.push(geometry);
          entry.objects.push(child);
        }
      }
      else if (child.geometry === undefined)
      {
        this.traverse(child);
      }
    }

    for (let entry of materialMap.values())
    {
      if (entry.geometries.length > 1)
      {
        let mergedGeometry =
          GeometryUtils.mergeBufferGeometries(entry.geometries, false);

        if (mergedGeometry)
        {
          for (let obj of entry.objects)
          {
            obj.removeFromParent();
            ObjectUtils.dispose(obj);
          }
          let mergedMesh = new THREE.Mesh(mergedGeometry, entry.material);
          mergedMesh.name = "merged_" + entry.material.id;
          object.add(mergedMesh);
          object.needsRebuild = true;
        }
      }
    }
  }
}

export { MergeGeometriesTool };

