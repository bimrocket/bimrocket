/*
 * CloudExplorerTool.js
 *
 * @author realor
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

      application.initControllers(object);
      application.addObject(object, application.baseObject, false, true);
      let container = application.container;
      let aspect = container.clientWidth / container.clientHeight;
      let camera = application.camera;

      object.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, object, aspect);

      application.notifyObjectsChanged(camera, this);

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
        console.error(error);
        panel.showButtonsPanel();
        MessageDialog.create("ERROR", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      manager : this.application.loadingManager,
      units: this.application.units
    };
    panel.showProgressBar();
    IOManager.load(intent);
  }

  showSaveDialog()
  {
    const application = this.application;
    const panel = this.panel;

    let filename = panel.entryName;
    if (filename === null || filename.length === 0)
    {
      const object = application.getModelRoot(false);
      filename = object && object !== application.baseObject ?
        IOManager.normalizeFilename(object.name) : "";
    }

    let dialog = new SaveDialog("title.save_to_cloud", filename);
    dialog.setI18N(this.application.i18n);
    dialog.onSave = (name, format, onlySelection) =>
    {
      panel.entryName = name;
      panel.entryType = Metadata.FILE;
      this.saveFile(panel.basePath + "/" + name, onlySelection);
    };
    dialog.show();
  }

  saveFile(path, onlySelection)
  {
    const application = this.application;
    const panel = this.panel;

    const roots = application.selection.roots;

    const object = application.getModelRoot(onlySelection);

    const intent =
    {
      name : path,
      object : object,
      onCompleted : data =>
      {
        panel.savePath(path, data);
      },
      onProgress : data => panel.setProgress(data.progress, data.message),
      onError : message =>
      {
        panel.showButtonsPanel();
        MessageDialog.create("ERROR", message)
          .setClassName("error")
          .setI18N(application.i18n).show();
      },
      options : { units : this.application.units }
    };
    panel.showProgressBar();
    IOManager.export(intent);
  }
}

export { CloudExplorerTool };