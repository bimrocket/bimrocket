/**
 * ScriptAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { Metadata } from "platform/io/FileService.js";
import { ScriptDialog } from "../ScriptDialog.js";

class ScriptAction extends FileAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);

    if (!fileExplorer.scriptDialog)
    {
      fileExplorer.scriptDialog = new ScriptDialog(fileExplorer);
    }
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;

    const type = fileExplorer.getSelectedFileExtension();

    return type === "js";
  }

  setScript(url, code, run = false)
  {
    const fileExplorer = this.fileExplorer;
    const scriptDialog = fileExplorer.scriptDialog;

    const index = url.lastIndexOf("/");
    let name = url.substring(index + 1);

    scriptDialog.scriptName = name;
    scriptDialog.scriptCode = code;
    scriptDialog.clearConsole();
    if (run)
    {
      let error = scriptDialog.run();
      if (error)
      {
        scriptDialog.show();
      }
    }
    else
    {
      scriptDialog.show();
    }
  }
}

export { ScriptAction };
