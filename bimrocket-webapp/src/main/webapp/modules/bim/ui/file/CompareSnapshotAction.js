/**
 * CompareSnapshotAction.js
 *
 * @author realor
 */

import { FileAction } from "platform/ui/file/FileAction.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { IOManager } from "platform/io/IOManager.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { BIMDeltaPanel } from "../BIMDeltaPanel.js";
import { ModelSnapshot } from "platform/utils/ModelSnapshot.js";

class CompareSnapshotAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);

    if (!fileExplorer.deltaPanel)
    {
      fileExplorer.deltaPanel = new BIMDeltaPanel(fileExplorer.application);
      fileExplorer.application.panelManager.addPanel(fileExplorer.deltaPanel);
    }
  }

  getLabel()
  {
    return "bim|action.compare_snapshot";
  }

  isDefaultAction()
  {
    return true;
  }

  isEnabled()
  {
    const extension = ModelSnapshot.SNAPSHOT_EXTENSION;
    return this.fileExplorer.getSelectedFileExtension() === extension;
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      if (result.data)
      {
        this.openFile(url, result.data);
      }
    });
  }

  openFile(url, data)
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;
    const deltaPanel = fileExplorer.deltaPanel;
    try
    {
      const snapshot = JSON.parse(data);
      if (deltaPanel.compareSnapshot(snapshot))
      {
        if (!deltaPanel.visible) deltaPanel.visible = true;
        else deltaPanel.minimized = false;
      }
      else deltaPanel.visible = false;
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", String(ex))
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
  }
}

export { CompareSnapshotAction };