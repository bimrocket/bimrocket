/**
 * OpenModelAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { IOManager } from "platform/io/IOManager.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";

class OpenModelAction extends FileAction
{
  constructor(fileExplorer)
  {
    super(fileExplorer);
  }

  getLabel()
  {
    return "base|action.open_model";
  }

  getIconName()
  {
    return "show";
  }

  isDefaultAction()
  {
    return true;
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;
    const type = fileExplorer.getSelectedFileExtension();
    const format = IOManager.formats[type];
    return Boolean(format?.loader);
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

    const onCompleted = object =>
    {
      const container = application.container;
      const baseObject = application.baseObject;
      const aspect = container.clientWidth / container.clientHeight;
      const camera = application.camera;

      object.updateMatrix();
      application.addObject(object, baseObject);

      ObjectUtils.reduceCoordinates(baseObject);
      ObjectUtils.zoomAll(camera, object, aspect);

      application.selection.set(object);
      application.initControllers(object);

      application.notifyObjectsChanged([baseObject, camera], this);
      application.progressBar.visible = false;
    };

    // read FILE
    const intent =
    {
      url : url,
      data : data,
      onCompleted : onCompleted,
      onProgress : data => fileExplorer.setProgress(data.progress, data.message),
      onError : error =>
      {
        console.error(error);
        application.progressBar.visible = false;
        MessageDialog.create("ERROR", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      manager : application.loadingManager,
      units: application.setup.units
    };
    fileExplorer.showProgressBar();
    IOManager.load(intent);
  }
}

export { OpenModelAction };