/**
 * CreateIDSAction.js
 *
 * Context menu action to create a new IDS file in the FileExplorer.
 *
 * @author UPC
 */

import { IDSAction } from "./IDSAction.js";

class CreateIDSAction extends IDSAction
{
  getLabel()
  {
    return this.options.label || "bim|ids.action.create";
  }

  isEnabled()
  {
    return this.getIDSDialog() !== null &&
           this.fileExplorer.isDirectoryList();
  }

  perform()
  {
    const dialog = this.getIDSDialog();
    if (!dialog) return;

    // Wire up the save callback so _saveAction() delegates back to the
    // FileExplorer action (which knows the destination directory).
    // Clear it afterwards so a later standalone Save doesn't re-trigger it.
    dialog.onSave = (name, content) =>
    {
      dialog.onSave = null;
      this.onSave(name, content);
    };

    // Reset to a blank IDS for the new file.
    dialog._ids = dialog._newIDS();
    dialog._currentFileName = null;

    // IDSEditorDialog extends Panel — use the visible setter, which calls
    // onShow() internally. Do NOT call dialog.show() (Dialog method) or
    // dialog.onShow() manually here, as that would double-fire onShow().
    dialog.visible = true;
  }
}

export { CreateIDSAction };
