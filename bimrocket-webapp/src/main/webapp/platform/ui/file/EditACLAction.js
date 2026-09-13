/**
 * EditACLAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { ACLEditorDialog } from "platform/ui/dialog/ACLEditorDialog.js";

class EditACLAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.edit_acl";
  }

  getIconName()
  {
    return "key";
  }

  isEnabled()
  {
    return this.fileExplorer.isDirectoryList();
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    let aclFilePath;

    if (fileExplorer.selectedEntry)
    {
      const entryName = fileExplorer.selectedEntry.name;
      aclFilePath = fileExplorer.getFullPath(entryName);
    }
    else
    {
      aclFilePath = fileExplorer.basePath;
    }

    const dialog = new ACLEditorDialog(application, fileExplorer.service,
      aclFilePath, fileExplorer);
    dialog.load();
  }
}

export { EditACLAction };
