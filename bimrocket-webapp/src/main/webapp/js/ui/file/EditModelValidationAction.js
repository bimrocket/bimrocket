/**
 * EditModelValidationAction.js
 *
 * @author realor
 */

import { ModelValidationAction } from "./ModelValidationAction.js";
import { MessageDialog } from "../MessageDialog.js";

class EditModelValidationAction extends ModelValidationAction
{
  getLabel()
  {
    return this.options.label || "bim|mv.action.edit";
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const panel = this.getModelValidationPanel();
    if (!panel) return;

    const entryName = fileExplorer.selectedEntry?.name;
    const path = fileExplorer.getFullPath(entryName);
    fileExplorer.service.read(path, result =>
    {
      const text = result.data;
      const isModelValidation = text?.includes("@sv-config:") ||
                                text?.includes("_sv_classes") ||
                                text?.includes("_sv_excluded");
      if (!isModelValidation)
      {
        MessageDialog.create("ERROR", "bim|mv.error.not_model_validation")
          .setClassName("error")
          .setI18N(fileExplorer.application.i18n).show();
        return;
      }
      panel._importContent(text, entryName);
      panel.visible = true;
      panel.minimized = false;
    });
  }
}

export { EditModelValidationAction };
