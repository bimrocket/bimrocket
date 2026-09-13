/**
 * CreateScriptAction.js
 *
 * @author realor
 */

import { ScriptAction } from "./ScriptAction.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";

class CreateScriptAction extends ScriptAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getLabel()
  {
    return this.options.label || "base|action.create_script";
  }

  getIconName()
  {
    return "base|script";
  }

  isEnabled()
  {
    return this.fileExplorer.isDirectoryList();
  }

  perform()
  {
    this.setScript("", "", false);
  }
}

export { CreateScriptAction };
