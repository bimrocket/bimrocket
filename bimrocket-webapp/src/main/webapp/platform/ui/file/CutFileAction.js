/**
 * CutFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";

class CutFileAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.cut";
  }

  getIconName()
  {
    return "cut";
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    return fileExplorer.isDirectoryList() && fileExplorer.isEntrySelected();
  }

  perform()
  {
    this.fileExplorer.cut();
  }
}

export { CutFileAction };