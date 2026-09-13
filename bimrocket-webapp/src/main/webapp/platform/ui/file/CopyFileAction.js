/**
 * CopyFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";

class CopyFileAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.copy";
  }

  getIconName()
  {
    return "copy";
  }


  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    return fileExplorer.isDirectoryList() && fileExplorer.isFileEntrySelected();
  }

  perform()
  {
    this.fileExplorer.copy();
  }
}

export { CopyFileAction };