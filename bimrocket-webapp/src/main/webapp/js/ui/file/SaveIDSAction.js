/**
 * SaveIDSAction.js
 *
 * Context menu action to save a pending IDS file to the current directory.
 *
 * @author UPC
 */

import { IDSAction } from "./IDSAction.js";

class SaveIDSAction extends IDSAction
{
  getLabel()
  {
    return this.options.label || "bim|ids.action.save_here";
  }

  isEnabled()
  {
    return this.fileExplorer.isDirectoryList() &&
           this.fileExplorer._pendingIDSSave != null;
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const pending = fileExplorer._pendingIDSSave;
    if (!pending) return;

    fileExplorer._pendingIDSSave = null;
    fileExplorer.save(pending.baseName, pending.content);
  }
}

export { SaveIDSAction };
