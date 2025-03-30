/*
 * BIMResetView.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { IFC } from "../io/ifc/IFC.js";
import { Solid } from "../core/Solid.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";

class BIMResetViewTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "reset_view";
    this.label = "bim|tool.bim_reset_view.label";
    this.help = "bim|tool.bim_reset_view.help";
    this.className = "bim_reset_view";
    this.view = { x : 90, y : 0, z : 0 },
    this.hiddenIfcClasses = [ "IfcSpace", "IfcOpeningElement" ];
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const application = this.application;
    const baseObject = application.baseObject;
    const container = application.container;
    const aspect = container.clientWidth / container.clientHeight;
    const camera = application.camera;
    const view = this.view;

    this.traverse(baseObject);

    camera.rotation.x = THREE.MathUtils.degToRad(view.x || 0);
    camera.rotation.y = THREE.MathUtils.degToRad(view.y || 0);
    camera.rotation.z = THREE.MathUtils.degToRad(view.z || 0);
    camera.updateMatrix();

    application.scene.updateMatrixWorld(true);
    ObjectUtils.zoomAll(camera, baseObject, aspect);

    application.selection.clear();
    application.useTool(null);
    application.notifyObjectsChanged(baseObject, this, "structureChanged");
  }

  traverse(object)
  {
    if (object.name === IFC.TypesName)
    {
      this.changeVisibility(object, false, true, true);
    }
    else if (object.name === IFC.RepresentationName)
    {
      let ifcClassName = object.parent?.userData.IFC?.ifcClassName;
      if (this.hiddenIfcClasses?.includes(ifcClassName))
      {
        this.changeVisibility(object, false, false, false);
      }
      else
      {
        this.changeVisibility(object, true, true, true);
      }
    }
    else
    {
      object.visible = true;
      for (let child of object.children)
      {
        this.traverse(child);
      }
    }
  }

  changeVisibility(object, visible, facesVisible, edgesVisbible)
  {
    object.visible = visible;
    if (object instanceof Solid)
    {
      object.facesVisible = facesVisible;
      object.edgesVisible = edgesVisbible;
      ObjectUtils.applyMaterial(object.facesObject, null);
      ObjectUtils.applyMaterial(object.edgesObject, null);
    }
    else if (object.material)
    {
      ObjectUtils.applyMaterial(object, null);
    }

    if (object.geometry)
    {
      visible = false; // descendants are invisible
    }

    let start = object instanceof Solid ? 2 : 0;
    for (let i = start; i < object.children.length; i++)
    {
      let child = object.children[i];
      this.changeVisibility(child, visible, facesVisible, edgesVisbible);
    }
  }
}

export { BIMResetViewTool };


