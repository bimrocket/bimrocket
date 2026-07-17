/**
 * IDSAction.js
 *
 * Base action class for IDS (Information Delivery Specification) file operations.
 *
 * @author UPC
 */

import { FileAction } from "./FileAction.js";
import { MessageDialog } from "../MessageDialog.js";

class IDSAction extends FileAction
{
  getIDSDialog()
  {
    return this.fileExplorer.application.tools["ids_editor"]?.dialog || null;
  }

  isEnabled()
  {
    return this.getIDSDialog() !== null &&
           this.fileExplorer.getSelectedFileExtension() === "ids";
  }

  onSave(name, content)
  {
    const fileExplorer = this.fileExplorer;
    if (fileExplorer.service)
    {
      fileExplorer.save(name, content);
    }
    else
    {
      MessageDialog.create("ERROR", "message.select_directory")
        .setClassName("error")
        .setI18N(fileExplorer.application.i18n).show();
    }
  }
}

export { IDSAction };
