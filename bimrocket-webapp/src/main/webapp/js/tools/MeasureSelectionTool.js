/*
 * MeasureSelectionTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../solid/Solid.js";
import { Dialog } from "../ui/Dialog.js";

class MeasureSelectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_selection";
    this.label = "tool.measure_selection.label";
    this.className = "measure_selection";
    this.setOptions(options);

    this.immediate = true;
  }

  execute()
  {
    let area = 0;
    let volume = 0;
    let solids = 0;

    const application = this.application;
    const roots = application.selection.roots;
    for (let object of roots)
    {
      object.traverse(obj =>
      {
        if (obj instanceof Solid)
        {
          if (obj.visible)
          {
            solids++;
            area += obj.getArea();
            volume += obj.getVolume();
          }
        }
      });
    }
    const decimals = application.decimals;
    const units = " " + application.units;
    const dialog = new Dialog(this.label);
    dialog.setSize(240, 160);
    dialog.setI18N(application.i18n);
    dialog.addTextWithArgs("message.solids_count", [solids], "row");
    dialog.addTextWithArgs("message.solids_area",
      [area.toFixed(decimals), units], "row");
    dialog.addTextWithArgs("message.solids_volume",
      [volume.toFixed(decimals), units], "row");
    let av = volume === 0 ? 0 : area/volume;
    dialog.addTextWithArgs("message.solids_area_volume",
      [av.toFixed(decimals)], "row");
    let button = dialog.addButton("accept", "button.accept",
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
}

export { MeasureSelectionTool };