/**
 * EditServiceAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { ServiceDialog } from "platform/ui/dialog/ServiceDialog.js";
import { ServiceManager } from "platform/io/ServiceManager.js";
import { FileService } from "platform/io/FileService.js";

class EditServiceAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.edit_service";
  }

  getIconName()
  {
    return "edit";
  }

  perform()
  {
    this.showEditServiceDialog();
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    return fileExplorer.isServiceList() && fileExplorer.isEntrySelected();
  }

  showEditServiceDialog()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;
    const entryName = fileExplorer.selectedEntry.name;
    const service = application.services[fileExplorer.group][entryName];

    const serviceTypes = ServiceManager.getTypesOf(FileService);
    let dialog = new ServiceDialog("title.edit_file_service",
      serviceTypes, service.constructor.name, service);

    dialog.setI18N(application.i18n);
    dialog.serviceTypeSelect.disabled = true;
    dialog.nameElem.readOnly = true;
    dialog.onSave = (serviceType, parameters) =>
    {
      fileExplorer.setServiceParameters(dialog, service, parameters);
    };
    dialog.show();
  }
}

export { EditServiceAction };