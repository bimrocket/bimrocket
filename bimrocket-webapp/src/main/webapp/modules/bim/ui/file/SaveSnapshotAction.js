/**
 * SaveSnapshotAction.js
 *
 * @author realor
 */

import { FileAction } from "platform/ui/file/FileAction.js";
import { IOManager } from "platform/io/IOManager.js";
import { Metadata, Result } from "platform/io/FileService.js";
import { InputDialog } from "platform/ui/dialog/InputDialog.js";
import { ModelSnapshot } from "platform/utils/ModelSnapshot.js";

class SaveSnapshotAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "bim|action.save_snapshot";
  }

  getIconName()
  {
    return "bim|delta";
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;
    const object = application.selection.object;

    return object && object.userData.IFC?.GlobalId &&
           fileExplorer.isDirectoryList();
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    const object = application.selection.object;
    if (object && object.userData.IFC?.GlobalId)
    {
      let name = object.userData.IFC.Name || "snp";
      let filename = name.replaceAll(" ", "_") + "-" +
        (new Date()).toISOString().substring(0, 19).replaceAll(":", "-");

      let dialog = new InputDialog(application,
        "bim|tool.bim_delta.label", "bim|label.bim_delta_snapshot_name", filename);
      dialog.setI18N(application.i18n);
      dialog.onAccept = () =>
      {
        let ending = "." + ModelSnapshot.SNAPSHOT_EXTENSION;
        let name = dialog.inputElem.value;
        if (!name.endsWith(ending)) name += ending;
        this.saveFile(name, object);
        dialog.hide();
      };
      dialog.show();
    }
    else
    {
      MessageDialog.create("bim|tool.bim_delta.label", "bim|message.bim_delta_not_ifc_object")
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }

  saveFile(entryName, object)
  {
    const fileExplorer = this.fileExplorer;
    const snapshot = ModelSnapshot.generate(object);
    const data = JSON.stringify(snapshot, null, 2);
    fileExplorer.save(entryName, data);
  }
}

export { SaveSnapshotAction };
