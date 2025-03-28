/*
 * OpenLocalTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { IOManager } from "../io/IOManager.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { MessageDialog } from "../ui/MessageDialog.js";

class OpenLocalTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "openlocal";
    this.label = "tool.openlocal.label";
    this.help = "tool.openlocal.help";
    this.className = "openlocal";
    this.setOptions(options);
    application.addTool(this);

    this._onChange = this.onChange.bind(this);
    this._onFocus = this.onFocus.bind(this);
  }

  activate()
  {
    let inputFile = document.createElement("input");
    this.inputFile = inputFile;

    inputFile.type = "file";
    inputFile.id = this.name + "_file";

    const extensions = IOManager.getSupportedLoaderExtensions();
    inputFile.accept = extensions.map(extension => "." + extension).join(", ");

    document.body.appendChild(inputFile);
    inputFile.addEventListener("change", this._onChange, false);
    document.body.addEventListener("focus", this._onFocus, true);
    inputFile.click();
  }

  deactivate()
  {
    if (this.inputFile)
    {
      let parentNode = this.inputFile.parentNode;
      parentNode.removeChild(this.inputFile);
    }
    document.body.removeEventListener("focus", this._onFocus, true);
  }

  onChange(event)
  {
    let files = this.inputFile.files;
    if (files.length > 0)
    {
      let file = files[0];
      let reader = new FileReader();
      const application = this.application;
      const t0 = Date.now();
      reader.onload = evt =>
      {
        const t1 = Date.now();
        console.info("File read as text in " + (t1 - t0) + " millis.");

        let data = evt.target.result;
        let intent =
        {
          url : "file://" + file.name,
          data : data,
          onProgress : data =>
          {
            application.progressBar.progress = data.progress;
            application.progressBar.message = data.message;
          },
          onCompleted : object =>
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
          },
          onError : error =>
          {
            console.error(error);
            application.progressBar.visible = false;
            MessageDialog.create("ERROR", error)
              .setClassName("error")
              .setI18N(application.i18n).show();
          },
          manager : this.application.loadingManager,
          units : application.setup.units
        };
        IOManager.load(intent); // async load
      };
      application.progressBar.message = "Loading file...";
      application.progressBar.progress = undefined;
      application.progressBar.visible = true;
      let formatInfo = IOManager.getFormatInfo(file.name);
      if (formatInfo?.dataType === "arraybuffer")
      {
        reader.readAsArrayBuffer(file);
      }
      else
      {
        reader.readAsText(file);
      }
    }
  }

  onFocus(event)
  {
    this.application.useTool(null);
  }
}

export { OpenLocalTool };
