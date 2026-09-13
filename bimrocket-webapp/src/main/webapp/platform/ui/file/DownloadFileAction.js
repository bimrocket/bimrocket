/**
 * DownloadFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";

class DownloadFileAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.download_file";
  }

  getIconName()
  {
    return "download";
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    return fileExplorer.isDirectoryList() && fileExplorer.isFileEntrySelected();
  }

  perform()
  {
    this.fileExplorer.download();
  }
}

export { DownloadFileAction };