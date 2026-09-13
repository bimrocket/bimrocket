/**
 * EditScriptAction.js
 *
 * @author realor
 */

import { ScriptAction } from "./ScriptAction.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";

class EditScriptAction extends ScriptAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getLabel()
  {
    return "base|action.edit_script";
  }

  getIconName()
  {
    return "edit";
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      this.setScript(url, result.data, false);
    });
  }
}

export { EditScriptAction };
