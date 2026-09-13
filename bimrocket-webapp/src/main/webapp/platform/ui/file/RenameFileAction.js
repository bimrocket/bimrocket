/**
 * RenameFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { Metadata } from "platform/io/FileService.js";
import { Dialog } from "platform/ui/dialog/Dialog.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";

class RenameFileAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.rename";
  }

  isEnabled()
  {
    return this.fileExplorer.isEntrySelected() &&
           this.fileExplorer.isDirectoryList();
  }

  getIconName()
  {
    return "rename";
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;
    const entryName = fileExplorer.selectedEntry.name;

    const dialog = new Dialog("title.rename_file");
    dialog.setSize(300, 160);
    dialog.setI18N(application.i18n);

    const nameElem = dialog.addTextField("file_name", "label.file_name");
    nameElem.setAttribute("spellcheck", "false");
    nameElem.value = entryName;
    nameElem.addEventListener("keyup", event =>
    {
      if (event.keyCode === 13) dialog.onAccept();
    });

    dialog.addButton("rename_accept", "button.accept", () => dialog.onAccept());
    dialog.addButton("rename_cancel", "button.cancel", () => dialog.onCancel());

    dialog.onAccept = async () =>
    {
      const newEntryName = nameElem.value.trim();
      if (newEntryName)
      {
        if (newEntryName === entryName)
        {
          // no change, do nothing
          dialog.hide();
        }
        else if (await fileExplorer.exists(newEntryName))
        {
          // a file exists with that name
          MessageDialog.create("ERROR", "message.filename_already_exists")
           .setClassName("error")
           .setI18N(application.i18n).show();
        }
        else
        {
          // rename file
          fileExplorer.rename(newEntryName);
          dialog.hide();
        }
      }
    };
    dialog.onCancel = () =>
    {
      dialog.hide();
    };
    dialog.onShow = () =>
    {
      nameElem.focus();
    };
    dialog.show();
  }
}

export { RenameFileAction };
