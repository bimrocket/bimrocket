/**
 * SaveModelValidationAction.js
 *
 * @author realor
 */

import { ModelValidationAction } from "./ModelValidationAction.js";

class SaveModelValidationAction extends ModelValidationAction
{
  getLabel()
  {
    return this.options.label || "bim|mv.action.save_here";
  }

  isEnabled()
  {
    return this.fileExplorer.isDirectoryList() &&
           this.fileExplorer._pendingModelValidationSave != null;
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const pending = fileExplorer._pendingModelValidationSave;
    if (!pending) return;

    fileExplorer._pendingModelValidationSave = null;
    fileExplorer.save(pending.baseName, pending.content);
  }
}

export { SaveModelValidationAction };
