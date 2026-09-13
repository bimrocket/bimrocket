/**
 * FileAction.js
 *
 * @author realor
 */

import { Action } from "platform/ui/Action.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";

class FileAction extends Action
{
  constructor(fileExplorer, options = {})
  {
    super();
    this.fileExplorer = fileExplorer;
    this.options = options;
  }

  isDefaultAction()
  {
    return false;
  }
}

export { FileAction };

