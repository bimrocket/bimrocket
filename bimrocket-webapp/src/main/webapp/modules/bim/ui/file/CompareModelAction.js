/**
 * CompareModelAction.js
 *
 * @author realor
 */

import { FileAction } from "platform/ui/file/FileAction.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { IOManager } from "platform/io/IOManager.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { BIMDeltaPanel } from "../BIMDeltaPanel.js";
import { ModelSnapshot } from "../../utils/ModelSnapshot.js";

class CompareModelAction extends FileAction
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
    return "bim|action.compare_model";
  }

  getIconName()
  {
    return "bim|compare-model";
  }

  isDefaultAction()
  {
    const extension = this.fileExplorer.getSelectedFileExtension();
    return extension === ModelSnapshot.SNAPSHOT_EXTENSION;
  }

  isEnabled()
  {
    const extension = this.fileExplorer.getSelectedFileExtension();
    return extension === ModelSnapshot.SNAPSHOT_EXTENSION ||
           extension === "ifc";
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      if (result.data)
      {
        if (url.endsWith("." + ModelSnapshot.SNAPSHOT_EXTENSION))
        {
          try
          {
            const snapshot = JSON.parse(result.data);
            this.compareSnapshot(snapshot);
          }
          catch (ex)
          {
            this.showError(ex);
          }
        }
        else // IFC
        {
          const intent =
          {
            format: "ifc",
            url: url,
            data: result.data,
            onCompleted: (model) =>
            {
              try
              {
                const snapshot = ModelSnapshot.generate(model);
                this.compareSnapshot(snapshot);
              }
              catch (ex)
              {
                this.showError(ex);
              }
            },
            onError: error => this.showError(error)
          };
          IOManager.load(intent);
        }
      }
    });
  }

  compareSnapshot(snapshot)
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;
    const deltaPanel = fileExplorer.deltaPanel;
    if (deltaPanel.compareSnapshot(snapshot))
    {
      if (!deltaPanel.visible) deltaPanel.visible = true;
      else deltaPanel.minimized = false;
    }
    else deltaPanel.visible = false;
  }

  showError(ex)
  {
    MessageDialog.create("ERROR", String(ex))
      .setClassName("error")
      .setI18N(this.application.i18n).show();
  }
}

export { CompareModelAction };