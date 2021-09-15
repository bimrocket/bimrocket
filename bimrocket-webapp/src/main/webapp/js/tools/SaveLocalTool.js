/*
 * SaveLocalTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { SaveDialog } from "../ui/SaveDialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { IOManager } from "../io/IOManager.js";

class SaveLocalTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "savelocal";
    this.label = "tool.savelocal.label";
    this.help = "tool.savelocal.help";
    this.className = "savelocal";
    this.url = null;
    this.setOptions(options);
  }

  activate()
  {
    let dialog = new SaveDialog(this.label, "scene.stl");
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (name, format, onlySelection) =>
    {
      this.onSave(name, format, onlySelection);
    };
    dialog.onCancel = () => { dialog.hide(); this.application.useTool(null); };
    dialog.show();
  }

  deactivate()
  {
  }

  onSave(name, format, onlySelection)
  {
    const application = this.application;
    if (this.url)
    {
      window.URL.revokeObjectURL(this.url);
    }
    let intent =
    {
      object : application.selection.object,
      name : name || "scene.stl"
    };

    try
    {
      let data = IOManager.export(intent);
      this.url = window.URL.createObjectURL(data);

      let linkElem = document.createElement("a");
      linkElem.download = intent.name;
      linkElem.target = "_blank";
      linkElem.href = this.url;
      linkElem.style.display = "block";
      linkElem.click();
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", ex)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
    this.application.useTool(null);
  }
}

export { SaveLocalTool };

