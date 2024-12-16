/*
 * MeshToSolidTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Selection } from "../utils/Selection.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Solid } from "../core/Solid.js";
import * as THREE from "three";

class MeshToSolidTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "mesh_to_solid";
    this.label = "tool.mesh_to_solid.label";
    this.help = "tool.mesh_to_solid.help";
    this.className = "mesh_to_solid";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const roots = application.selection.roots;
    const newRoots = this.convert(roots);
    application.selection.set(...newRoots);
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

    return roots.map(object => replacements.get(object) || object);
  }

  traverse(object, replacements)
  {
    if (object instanceof THREE.Mesh)
    {
      let mesh = object;
      let solid = this.meshToSolid(mesh);
      replacements.set(mesh, solid);
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

  meshToSolid(mesh)
  {
    const parent = mesh.parent;
    const parentIndex = parent.children.indexOf(mesh);

    let solid = new Solid();

    solid.updateGeometry(mesh.geometry, true);

    parent.children[parentIndex] = solid;
    solid.name = mesh.name;
    solid.userData = mesh.userData;
    solid.visible = mesh.visible;
    solid.parent = parent;

    if (mesh.material) solid.material = mesh.material;
    mesh.matrix.decompose(solid.position, solid.rotation, solid.scale);
    solid.updateMatrix();

    mesh.parent = null;
    ObjectUtils.dispose(mesh);

    return solid;
  }
}

export { MeshToSolidTool };

