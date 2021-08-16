/*
 * CloudExplorerTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/FileExplorer.js";
import { SaveDialog } from "../ui/SaveDialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { Toast } from "../ui/Toast.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { IOManager } from "../io/IOManager.js";
import { Metadata, Result } from "../io/FileService.js";

class CloudExplorerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "cloud_explorer";
    this.label = "tool.cloud_explorer.label";
    this.help = "tool.cloud_explorer.help";
    this.className = "cloud_explorer";
    this.setOptions(options);

    const panel = new FileExplorer(application);
    this.panel = panel;

    panel.title = this.label;
    panel.group = "model";

    panel.addContextButton("save", "button.save",
      () => this.showSaveDialog(), () => panel.service !== null);

    panel.openFile = (url, data) => this.openFile(url, data);

    application.panelManager.addPanel(this.panel);
  }

  activate()
  {
    this.panel.visible = true;
    if (this.panel.service === null)
    {
      this.panel.goHome();
    }
  }

  deactivate()
  {
    this.panel.visible = false;
  }


  openFile(url, data)
  {
    const application = this.application;
    const panel = this.panel;

    const onCompleted = object =>
    {
      object.updateMatrix();

      application.addObject(object, application.baseObject);
      let container = application.container;
      let aspect = container.clientWidth / container.clientHeight;
      let camera = application.camera;

      object.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, object, aspect);

      let changeEvent = {type: "nodeChanged", objects: [camera], source : this};
      application.notifyEventListeners("scene", changeEvent);

      application.progressBar.visible = false;
      panel.showButtonsPanel();
    };

    // read FILE
    const intent =
    {
      url : url,
      data : data,
      onCompleted : onCompleted,
      onProgress : data => panel.setProgress(data.progress, data.message),
      onError : error =>
      {
        panel.showButtonsPanel();
        MessageDialog.create("ERROR", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      options : { units : this.application.units }
    };
    panel.showProgressBar();
    IOManager.load(intent);
  }

  showSaveDialog()
  {
    const panel = this.panel;

    let dialog = new SaveDialog("title.save_to_cloud", panel.entryName);
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (name, format, onlySelection) =>
    {
      panel.entryName = name;
      panel.entryType = Metadata.FILE;
      this.savePath(panel.basePath + "/" + name);
    };
    dialog.show();
  }

  savePath(path)
  {
    const application = this.application;
    const panel = this.panel;

    let object = application.selection.object || application.baseObject;

    const intent =
    {
      name : path,
      object : object,
      onCompleted : data =>
      {
        panel.service.save(data, path,
          result => this.handleSaveResult(path, result));
      },
      onProgress : data => panel.setProgress(data.progress, data.message),
      onError : message =>
      {
        panel.showButtonsPanel();
        MessageDialog.create("ERROR", message).setI18N(application.i18N).show();
      },
      options : { units : this.application.units }
    };
    panel.showProgressBar();
    IOManager.export(intent);
  }

  handleSaveResult(path, result)
  {
    const application = this.application;
    const panel = this.panel;

    panel.showButtonsPanel();
    if (result.status === Result.ERROR)
    {
      MessageDialog.create("ERROR", result.message)
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
    else
    {
      Toast.create("message.file_saved")
        .setI18N(application.i18n).show();

      // reload basePath
      panel.openPath(panel.basePath);
    }
  }
}

export { CloudExplorerTool };