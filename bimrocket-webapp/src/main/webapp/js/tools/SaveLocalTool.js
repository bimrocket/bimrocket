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
    application.addTool(this);
  }

  activate()
  {
    const application = this.application;
    const object = application.getModelRoot(false);
    let filename = object && object !== application.baseObject ?
      IOManager.normalizeFilename(object.name) : "";

    let dialog = new SaveDialog(this.label, filename);
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (name, format, onlySelection) =>
    {
      this.onSave(name, format, onlySelection);
    };
    dialog.onHide = () => application.useTool(null);
    dialog.onCancel = () => { dialog.hide(); application.useTool(null); };
    dialog.show();
  }

  deactivate()
  {
  }

  onSave(name, formatName, onlySelection)
  {
    const application = this.application;
    if (this.url)
    {
      window.URL.revokeObjectURL(this.url);
    }
    const object = application.getModelRoot(onlySelection);

    const onCompleted = data =>
    {
      try
      {
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
    };

    const onError = error =>
    {
      MessageDialog.create("ERROR", error)
        .setClassName("error")
        .setI18N(application.i18n).show();
      this.application.useTool(null);
    };

    let intent =
    {
      object : object,
      name : name || this.defaultFileName,
      onCompleted : onCompleted,
      onError : onError
    };
    IOManager.export(intent);
  }
}

export { SaveLocalTool };

