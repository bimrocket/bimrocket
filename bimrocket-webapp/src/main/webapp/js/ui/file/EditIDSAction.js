/**
 * EditIDSAction.js
 *
 * Context menu action to open an existing .ids file in the IDS editor.
 *
 * @author UPC
 */

import { IDSAction } from "./IDSAction.js";
import { MessageDialog } from "../MessageDialog.js";

class EditIDSAction extends IDSAction
{
  getLabel()
  {
    return this.options.label || "bim|ids.action.edit";
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const dialog = this.getIDSDialog();
    if (!dialog) return;

    const entryName = fileExplorer.selectedEntry?.name;
    const path      = fileExplorer.getFullPath(entryName);

    fileExplorer.service.read(path, result =>
    {
      // Try to parse the XML — show an error and abort if it fails.
      // (We call loadFromXml directly here instead of _importContent so we
      //  can show a localised error dialog before making the panel visible.)
      if (!dialog.loadFromXml(entryName, result.data))
      {
        MessageDialog.create("ERROR", "bim|ids.error.not_ids")
          .setClassName("error")
          .setI18N(fileExplorer.application.i18n).show();
        return;
      }

      // Store the server filename so the Save dialog pre-fills it correctly.
      dialog._currentFileName = entryName;

      // Making the panel visible triggers onShow() internally (Panel setter),
      // which re-renders all tabs with the newly parsed IDS data.
      dialog.visible = true;

      // Highlight any facet values that don't exist in the currently loaded model.
      dialog._showModelWarnings?.();
    });
  }
}

export { EditIDSAction };
