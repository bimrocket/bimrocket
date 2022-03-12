/*
 * ExportSelectionTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { PropertySelectorDialog } from "../ui/PropertySelectorDialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "../lib/three.module.js";

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
    this.immediate = true;

    this.dialog = new PropertySelectorDialog(this.application,
      { title : "title.export_selection",
        selectValues : false,
        treeLabel : "label.selection_properties",
        editorLabel : "label.exported_properties",
        findPropertiesOnSelection : true
      });
    const dialog = this.dialog;

    dialog.addContextButton("add_prop", "button.add",
      () => this.addProperty());

    dialog.addContextButton("clear_prop", "button.clear",
      () => this.clearProperties());

    dialog.onAccept = () => this.exportProperties();
  }

  execute()
  {
    this.dialog.show();
  }

  addProperty()
  {
    const dialog = this.dialog;
    let path = dialog.getSelectedNodePath();
    let propertyMap = dialog.propertyMap;

    let paths = [];
    if (path.length === 1)
    {
      let items = propertyMap.get(path[0]);
      if (items instanceof Map)
      {
        for (let key of items.keys())
        {
          paths.push([path[0], key]);
        }
      }
      else paths.push(path);
    }
    else paths.push(path);

    for (let path of paths)
    {
      let line = '"' + path[path.length - 1] + '" : $(';
      for (let i = 0; i < path.length; i++)
      {
        let part = path[i];
        if (i > 0) line += ", ";
        line += '"' + part + '"';
      }
      line += ")";
      dialog.editor.value += line + "\n";
    }
  }

  clearProperties()
  {
    const dialog = this.dialog;
    dialog.editor.value = "";
  }

  exportProperties()
  {
    const application = this.application;
    const dialog = this.dialog;

    try
    {
      let properties = dialog.editor.value;
      let lines = properties.split("\n").filter(line => line.trim().length > 0);
      let exportExpression = "{" + lines.join(",") + "}";
      let roots = application.selection.roots;
      let exportedData = [];

      let fn = ObjectUtils.createEvalFunction(exportExpression);

      let headersObject = fn(new THREE.Object3D());

      let headers = [];
      for (let key in headersObject)
      {
        headers.push(key);
      }
      exportedData.push(headers.join(";"));

      for (let root of roots)
      {
        exportedData.push(this.toCSVRow(fn(root)));
      }
      let csv = "\uFEFF" + exportedData.join("\n");
      const blob = new Blob([csv], {type : 'text/csv'});
      let url = window.URL.createObjectURL(blob);

      let linkElem = document.createElement("a");
      linkElem.download = "export.csv";
      linkElem.target = "_blank";
      linkElem.href = url;
      linkElem.style.display = "block";
      linkElem.click();

      dialog.hide();
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", ex)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  toCSVRow(data)
  {
    let line = "";
    for (let columnName in data)
    {
      let value = data[columnName];
      if (line.length > 0) line += ";";
      if (value === undefined)
      {
      }
      else if (typeof value === "string")
      {
        line += '"' + value + '"';
      }
      else if (typeof value === "number")
      {
        line += ("" + value).replace(".", ",");
      }
      else line += value;
    }
    return line;
  }
}

export { ExportSelectionTool };
