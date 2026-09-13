/*
 * ExportSelectionTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Controls } from "platform/ui/Controls.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { WebUtils } from "platform/utils/WebUtils.js";
import { PropertySelectorDialog } from "../ui/PropertySelectorDialog.js";
import * as THREE from "three";

class ExportSelectionTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "export_selection";
    this.label = "base|tool.export_selection.label";
    this.className = "export-selection";
    this.iconName = "base|export-selection";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.dialog = new PropertySelectorDialog(this.application,
      { title : "base|title.export_selection",
        selectValues : false,
        treeLabel : "base|label.selection_properties",
        editorLabel : "base|label.exported_properties",
        findPropertiesOnSelection : true
      });
    const dialog = this.dialog;

    this.addButton = dialog.addContextButton("add_prop", "button.add",
      () => this.addProperty());

    this.clearButton = dialog.addContextButton("clear_prop", "button.clear",
      () => this.clearProperties());

    dialog.onAccept = () => this.exportProperties();

    dialog.updateContextButtons = () =>
    {
      let path = dialog.getSelectedNodePath();
      this.addButton.disabled = path.length === 0;
    };
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
      let line = '"' + path[path.length - 1] + '": $(';
      for (let i = 0; i < path.length; i++)
      {
        let part = path[i];
        if (i > 0) line += ", ";
        line += '"' + part + '"';
      }
      line += ")";

      dialog.appendCode(line + "\n");
    }
  }

  clearProperties()
  {
    const dialog = this.dialog;
    dialog.setCode("");
  }

  exportProperties()
  {
    const application = this.application;
    const dialog = this.dialog;

    try
    {
      let properties = dialog.getCode();

      let lines = properties.split("\n").filter(line => line.trim().length > 0);
      let exportExpression = "{" + lines.join(",") + "}";
      let exportedData = [];

      let fn = ObjectUtils.createEvalFunction(exportExpression);

      let headersObject = fn(new THREE.Object3D());

      let headers = [];
      for (let key in headersObject)
      {
        headers.push(key);
      }
      exportedData.push(headers.join(";"));

      let objects = application.selection.objects;
      for (let object of objects)
      {
        exportedData.push(this.toCSVRow(fn(object)));
      }
      let csv = "\uFEFF" + exportedData.join("\n");

      WebUtils.downloadFile(csv, "export.csv", "text/csv");

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
