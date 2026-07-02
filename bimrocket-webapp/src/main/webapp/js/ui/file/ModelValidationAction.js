/**
 * ModelValidationAction.js
 *
 * @author realor
 */

import { FileAction } from "./FileAction.js";
import { MessageDialog } from "../MessageDialog.js";

class ModelValidationAction extends FileAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getModelValidationPanel()
  {
    return this.fileExplorer.application.tools["model_validation"]?.panel || null;
  }

  isEnabled()
  {
    return this.getModelValidationPanel() !== null &&
           this.fileExplorer.getSelectedFileExtension() === "js";
  }

  onSave(name, code)
  {
    const fileExplorer = this.fileExplorer;
    if (fileExplorer.service)
    {
      fileExplorer.save(name, code);
    }
    else
    {
      MessageDialog.create("ERROR", "message.select_directory")
        .setClassName("error")
        .setI18N(fileExplorer.application.i18n).show();
    }
  }
}

export { ModelValidationAction };
