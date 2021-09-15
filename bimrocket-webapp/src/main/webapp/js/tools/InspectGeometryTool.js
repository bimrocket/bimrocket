/*
 * InspectGeometryTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Solid } from "../core/Solid.js";
import { Dialog } from "../ui/Dialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";

class InspectGeometryTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "inspect_geometry";
    this.label = "tool.inspect_geometry.label";
    this.className = "inspect_geometry";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let object = application.selection.object;
    if (object instanceof Solid)
    {
      if (object.geometry)
      {
        let data = [];
        let vertices = object.geometry.vertices;
        let faces = object.geometry.faces;
        for (let f = 0; f < faces.length; f++)
        {
          let face = faces[f];
          let indices = face.indices;
          data.push("face " + f);
          data.push("normal " +
            face.normal.x + ", " + face.normal.y + ", " + face.normal.z);
          for (let n = 0; n < face.indices.length; n++)
          {
            let index = indices[n];
            let vertex = vertices[index];
            data.push("vertex " + n + " (" + index + ") = " +
              vertex.x + ", " + vertex.y + " " + vertex.z);
          }
        }
        const dialog = new Dialog(this.label);
        dialog.setSize(600, 500);
        dialog.setI18N(application.i18n);
        let json = data.join("\n");
        dialog.addCode(json);
        dialog.addButton("accept", "button.accept", () => dialog.hide());
        dialog.show();
      }
    }
    else
    {
      MessageDialog.create(this.label, "message.no_solid_selected")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
  }
}

export { InspectGeometryTool };