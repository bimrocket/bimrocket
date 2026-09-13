/*
 * SaveLocalTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { SaveDialog } from "platform/ui/dialog/SaveDialog.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { IOManager } from "platform/io/IOManager.js";
import { WebUtils } from "platform/utils/WebUtils.js";

class SaveLocalTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "savelocal";
    this.label = "base|tool.save_local.label";
    this.help = "base|tool.save_local.help";
    this.className = "save-local";
    this.iconName = "base|save-local";

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
    const object = application.getModelRoot(onlySelection);

    const onCompleted = data =>
    {
      try
      {
        WebUtils.downloadFile(data, intent.name);
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

