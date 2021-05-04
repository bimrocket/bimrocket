/*
 * InspectGeometryTool.js
 *
 * @autor: realor
 */

BIMROCKET.InspectGeometryTool = class extends BIMROCKET.Tool
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
    let application = this.application;
    let object = application.selection.object;
    if (object instanceof BIMROCKET.Solid)
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
        let dialog = new BIMROCKET.Dialog("Geometry inspector", 600, 500);
        dialog.addCode(data.join("\n"));
        dialog.addButton("accept", "Accept", function() { dialog.hide(); });
        dialog.show();
      }
    }
    else
    {
      let dialog = new BIMROCKET.MessageDialog("Geometry inspector", 
        "No object selected.");
      dialog.show();
    }
  }
};