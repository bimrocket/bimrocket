/**
 * AddServiceAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { ServiceDialog } from "platform/ui/dialog/ServiceDialog.js";
import { ServiceManager } from "platform/io/ServiceManager.js";
import { FileService } from "platform/io/FileService.js";

class AddServiceAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "action.add_service";
  }

  getIconName()
  {
    return "add-service";
  }

  isEnabled()
  {
    return this.fileExplorer.isServiceList();
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;
    const serviceTypes = ServiceManager.getTypesOf(FileService);
    let dialog = new ServiceDialog("title.add_file_service", serviceTypes);
    dialog.services = application.services[this.group];

    dialog.setI18N(application.i18n);
    dialog.onSave = (serviceType, parameters) =>
    {
      const service = new ServiceManager.classes[serviceType];
      fileExplorer.setServiceParameters(dialog, service, parameters);
    };
    dialog.show();
  }
}

export { AddServiceAction };