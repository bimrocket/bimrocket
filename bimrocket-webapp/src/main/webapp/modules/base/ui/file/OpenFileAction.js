/**
 * OpenFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { IOManager } from "platform/io/IOManager.js";
import { Metadata } from "platform/io/FileService.js";

class OpenFileAction extends FileAction
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
    if (!fileExplorer.isFileEntrySelected()) return false;

    const name = fileExplorer.selectedEntry.name;
    const formatInfo = IOManager.getFormatInfo(name);
    if (formatInfo)
    {
      return !formatInfo.loader;
    }
    return false;
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      const formatInfo = IOManager.getFormatInfo(result.path);
      if (formatInfo)
      {
        let type = formatInfo.mimeType;
        if (formatInfo.dataType === "text" && !type.includes("charset"))
        {
          type += ";charset=utf-8";
        }

        const blob = new Blob([result.data], { type });
        const objectUrl = URL.createObjectURL(blob);

        window.open(objectUrl, '_blank');
      }
    });
  }
}

export { OpenFileAction };