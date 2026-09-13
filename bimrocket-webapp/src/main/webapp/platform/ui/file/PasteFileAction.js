/**
 * PasteFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";

class PasteFileAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.paste";
  }

  getIconName()
  {
    return "clipboard";
  }

  isEnabled()
  {
    return this.fileExplorer.isPasteEnabled();
  }

  perform()
  {
    this.fileExplorer.confirmPaste();
  }
}

export { PasteFileAction };