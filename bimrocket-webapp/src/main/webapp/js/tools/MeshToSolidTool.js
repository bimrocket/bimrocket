/*
 * MeshToSolidTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Selection } from "../utils/Selection.js";
import { Solid } from "../core/Solid.js";
import * as THREE from "../lib/three.module.js";

class MeshToSolidTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "make_solid";
    this.label = "tool.mesh_to_solid.label";
    this.help = "tool.mesh_to_solid.help";
    this.className = "mesh_to_solid";
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
    if (object instanceof THREE.Mesh)
    {
      this.meshToSolid(object);
    }
    else
    {
      let children = object.children;
      for (let child of children)
      {
        this.traverse(child);
      }
    }
  }

  meshToSolid(mesh)
  {
    console.info("mesh", mesh);
    
    const parent = mesh.parent;
    const parentIndex = parent.children.indexOf(mesh);

    let solid = new Solid();
    
    solid.updateGeometry(mesh.geometry, true);

    parent.children[parentIndex] = solid;
    solid.name = mesh.name;
    solid.userData = mesh.userData;
    solid.visible = mesh.visible;
    solid.parent = parent;
    mesh.parent = null;

    if (mesh.material) solid.material = mesh.material;
    mesh.matrix.decompose(solid.position, solid.rotation, solid.scale);
    solid.updateMatrix();
    
    return solid;
  }
}

export { MeshToSolidTool };

