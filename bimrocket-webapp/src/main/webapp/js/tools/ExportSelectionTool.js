/*
 * ExportSelectionTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";

class ExportSelectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "export_selection";
    this.label = "tool.export_selection.label";
    this.help = "tool.export_selection.help";
    this.className = "export_selection";
    this.setOptions(options);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");

    this.propertySelect = Controls.addSelectField(this.panel.bodyElem,
      "exp_property", "Properties:");

    this.propertySelect.style.maxWidth = "98%";

//    this.url = window.URL.createObjectURL(data);
//
//    let linkElem = document.createElement("a");
//    linkElem.download = intent.name;
//    linkElem.target = "_blank";
//    linkElem.href = this.url;
//    linkElem.style.display = "block";
//    linkElem.click();
  }

  activate()
  {
    this.panel.visible = true;
    let options = this.findPaths();
    Controls.setSelectOptions(this.propertySelect, options);
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  findPaths()
  {
    const application = this.application;

    const roots = application.selection.roots;

    const pathSet = new Set();

    for (let root of roots)
    {
      root.traverse(object =>
      {
        this.addPaths(object.userData, "", pathSet);
      });
    }
    return Array.from(pathSet).sort();
  }

  addPaths(data, path, pathSet)
  {
    for (let key in data)
    {
      let value = data[key];
      let type = typeof value;
      let newPath = path.length > 0 ? path + "." + key : key;

      if (type === "string" || type === "number" || type === "boolean")
      {
        pathSet.add(newPath);
      }
      else if (type === "object")
      {
        this.addPaths(value, newPath, pathSet);
      }
    }
  }
}

export { ExportSelectionTool };
