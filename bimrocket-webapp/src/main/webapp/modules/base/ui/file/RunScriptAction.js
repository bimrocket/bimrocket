/**
 * RunScriptAction.js
 *
 * @author realor
 */

import { ScriptAction } from "./ScriptAction.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";

class RunScriptAction extends ScriptAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getLabel()
  {
    return "base|action.run_script";
  }

  getIconName()
  {
    return "run";
  }

  isDefaultAction()
  {
    return true;
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      this.setScript(url, result.data, true);
    });
  }
}

export { RunScriptAction };
