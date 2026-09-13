/**
 * SaveModelAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { IOManager } from "platform/io/IOManager.js";
import { Metadata, Result } from "platform/io/FileService.js";
import { SaveDialog } from "platform/ui/dialog/SaveDialog.js";

class SaveModelAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "base|action.save_model";
  }

  getIconName()
  {
    return "save";
  }

  isEnabled()
  {
    const application = this.fileExplorer.application;
    const baseObject = application.baseObject;

    return this.fileExplorer.isDirectoryList() && baseObject.children.length > 0;
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    let filename = fileExplorer.selectedEntry?.name;
    if (!filename)
    {
      const object = application.getModelRoot(false);
      filename = object && object !== application.baseObject ?
        IOManager.normalizeFilename(object.name) : "";
    }

    let dialog = new SaveDialog("title.save_to_cloud", filename);
    dialog.setI18N(application.i18n);
    dialog.onSave = (name, format, onlySelection) =>
    {
      this.saveFile(name, onlySelection);
    };
    dialog.show();
  }

  saveFile(entryName, onlySelection)
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    const roots = application.selection.roots;

    const object = application.getModelRoot(onlySelection);

    const intent =
    {
      name : entryName,
      object : object,
      onCompleted : data =>
      {
        fileExplorer.save(entryName, data);
      },
      onProgress : data => fileExplorer.setProgress(data.progress, data.message),
      onError : message =>
      {
        application.progressBar.visible = false;
        MessageDialog.create("ERROR", message)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      options : { units : application.setup.units }
    };
    fileExplorer.showProgressBar();
    IOManager.export(intent);
  }
}

export { SaveModelAction };
