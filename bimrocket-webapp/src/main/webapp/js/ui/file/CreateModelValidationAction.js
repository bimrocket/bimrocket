/**
 * CreateModelValidationAction.js
 *
 * @author realor
 */

import { ModelValidationAction } from "./ModelValidationAction.js";

class CreateModelValidationAction extends ModelValidationAction
{
  getLabel()
  {
    return this.options.label || "bim|mv.action.create";
  }

  isEnabled()
  {
    return this.getModelValidationPanel() !== null &&
           this.fileExplorer.isDirectoryList();
  }

  perform()
  {
    const panel = this.getModelValidationPanel();
    if (!panel) return;

    panel._sourceFileExplorer = this.fileExplorer;

    panel.onSave = (name, code) =>
    {
      panel.onSave = null;
      panel._sourceFileExplorer = null;
      panel.onClose = originalOnClose;
      this.onSave(name, code);
    };

    const originalOnClose = panel.onClose;
    panel.onClose = () =>
    {
      panel.onSave = null;
      panel._sourceFileExplorer = null;
      panel.onClose = originalOnClose;
      if (typeof originalOnClose === "function") originalOnClose();
    };

    panel.visible = true;
    panel.minimized = false;
  }
}

export { CreateModelValidationAction };
