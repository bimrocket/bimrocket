/**
 * ShareFileAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { WebdavService } from "platform/io/WebdavService.js";
import { ShareFileDialog } from "platform/ui/dialog/ShareFileDialog.js";

class ShareFileAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.share";
  }

  getIconName()
  {
    return "share";
  }

  isDefaultAction()
  {
    return false;
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    const service = fileExplorer.service;
    return fileExplorer.isFileEntrySelected() &&
           service instanceof WebdavService;
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const path = fileExplorer.getSelectedPath();

    const dialog = new ShareFileDialog();
    dialog.setPath(path);
    dialog.setI18N(fileExplorer.application.i18n);
    dialog.show();
  }
}

export { ShareFileAction };
