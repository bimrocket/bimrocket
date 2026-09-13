/**
 * OpenFolderAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";

class OpenFolderAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.open";
  }

  getIconName()
  {
    return "show";
  }

  isDefaultAction()
  {
    return true;
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    return fileExplorer.isCollectionEntrySelected() ||
           fileExplorer.isServiceEntrySelected();
  }

  perform()
  {
    this.fileExplorer.open();
  }
}

export { OpenFolderAction };