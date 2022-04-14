/*
 * SolidToMeshTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Selection } from "../utils/Selection.js";
import { Solid } from "../core/Solid.js";
import * as THREE from "../lib/three.module.js";

class SolidToMeshTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "make_solid";
    this.label = "tool.solid_to_mesh.label";
    this.help = "tool.solid_to_mesh.help";
    this.className = "solid_to_mesh";
    this.setOptions(options);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const roots = application.selection.roots;
    application.selection.clear();
    this.convert(roots);
  }

  convert(roots)
  {
    const replacements = new Map();
    const application = this.application;
    const parents = new Selection();
    for (let root of roots)
    {
      parents.add(root.parent);
      this.traverse(root, replacements);
    }

    application.baseObject.traverse(object =>
    {
      if (object.builder)
      {
        let updated = object.builder.updateReferences(object,
          ref => replacements.get(ref) || null);

        if (updated)
        {
          object.needsRebuild = true;
        }
      }
    });

    const changed = parents.roots;
    application.notifyObjectsChanged(changed, this, "structureChanged");
  }

  traverse(object, replacements)
  {
    if (object instanceof Solid)
    {
      let solid = object;
      let mesh = this.solidToMesh(solid);
      replacements.set(solid, mesh);
    }
    else
    {
      let children = object.children;
      for (let child of children)
      {
        this.traverse(child, replacements);
      }
    }
  }

  solidToMesh(solid)
  {
    const parent = solid.parent;
    const parentIndex = parent.children.indexOf(solid);

    let mesh = new THREE.Mesh();
    mesh.geometry.copy(solid.geometry);

    parent.children[parentIndex] = mesh;
    mesh.name = solid.name;
    mesh.userData = solid.userData;
    mesh.visible = solid.visible && solid.facesVisible;
    mesh.parent = parent;
    solid.parent = null;

    solid.matrix.decompose(mesh.position, mesh.rotation, mesh.scale);
    mesh.updateMatrix();
    if (solid.material) mesh.material = solid.material;

    return mesh;
  }
}

export { SolidToMeshTool };

