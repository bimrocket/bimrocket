/*
 * MeasureSelectionTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { Dialog } from "../ui/Dialog.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import * as THREE from "three";

class MeasureSelectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_selection";
    this.label = "tool.measure_selection.label";
    this.className = "measure_selection";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    let area = 0;
    let volume = 0;
    let objectCount = 0;

    const application = this.application;
    const roots = application.selection.roots;

    function traverse(obj)
    {
      if (!obj.visible) return;

      if (obj instanceof Solid)
      {
        objectCount++;
        area += obj.getArea();
        volume += obj.getVolume();
      }
      else if (obj instanceof THREE.Mesh)
      {
        objectCount++;
        area += GeometryUtils.getBufferGeometryArea(obj.geometry);
      }
      else
      {
        for (let child of obj.children)
        {
          traverse(child);
        }
      }
    }

    for (let object of roots)
    {
      traverse(object);
    }
    const decimals = application.setup.decimals;
    const units = " " + application.setup.units;
    const dialog = new Dialog(this.label);
    dialog.setSize(240, 160);
    dialog.setI18N(application.i18n);
    dialog.addTextWithArgs("message.object_count", [objectCount], "row");
    dialog.addTextWithArgs("message.total_area",
      [area.toFixed(decimals), units], "row");
    dialog.addTextWithArgs("message.total_volume",
      [volume.toFixed(decimals), units], "row");
    let av = volume === 0 ? 0 : area/volume;
    dialog.addTextWithArgs("message.area_volume_ratio",
      [av.toFixed(decimals)], "row");
    let button = dialog.addButton("accept", "button.accept",
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
}

export { MeasureSelectionTool };