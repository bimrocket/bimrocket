/*
 * OpenLocalTool.js
 *
 * @author realor
 * @author iliasouazani-upc
 */

import { Tool } from "./Tool.js";
import { IOManager } from "../io/IOManager.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";

class OpenLocalTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "openlocal";
    this.label = "tool.openlocal.label";
    this.help = "tool.openlocal.help";
    this.className = "openlocal";
    this.dragAndDropEnabled = true;
    this.setOptions(options);
    application.addTool(this);

    this._onChange = this.onChange.bind(this);
    this._onFocus = this.onFocus.bind(this);

    this.fileQueue = [];
    this.isProcessing = false;
    this.isShowingError = false;

    if (this.dragAndDropEnabled)
    {
      this.createDropIndicator();
      this.registerDragAndDrop();
    }
  }

  createDropIndicator()
  {
    const container = this.application.container;

    const dropIndicator = document.createElement("div");
    dropIndicator.className = "drop_indicator hidden";
    I18N.set(dropIndicator, "textContent", "tool.openlocal.drop_here");
    this.application.i18n.update(dropIndicator);
    this.dropIndicator = dropIndicator;
    container.appendChild(dropIndicator);
  }

  activate()
  {
    let inputFile = document.createElement("input");
    this.inputFile = inputFile;

    inputFile.type = "file";
    inputFile.multiple = true;
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
    this.loadFiles(this.inputFile.files);
  }

  loadFiles(files)
  {
    if (files.length > 0)
    {
      this.fileQueue.push(...files);
      if (!this.isProcessing)
      {
        this.isProcessing = true;
        this.processQueue();
      }
    }
  }

  processQueue()
  {
    this.isShowingError = false;

    if (this.fileQueue.length > 0)
    {
      const file = this.fileQueue.shift();
      this.uploadFile(file);
    }
    else
    {
      this.isProcessing = false;
    }
  }

  uploadFile(file)
  {
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

          this.processQueue();
        },
        onError : error =>
        {
          console.error(error);
          application.progressBar.visible = false;
          this.isShowingError = true;

          const errorMessage = String(error);
          const message = application.i18n.get("message.file_open_error",
            file.name, errorMessage);

          MessageDialog.create("ERROR", message)
            .setClassName("error")
            .setAction(() => this.processQueue())
            .setI18N(application.i18n).show();
        },
        manager : this.application.loadingManager,
        units : application.setup.units
      };
      IOManager.load(intent);
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

  onFocus(event)
  {
    this.application.useTool(null);
  }

  registerDragAndDrop()
  {
    const body = document.body;
    const container = this.application.container;
    const application = this.application;

    const dragElement = document.body;

    dragElement.addEventListener("dragover", event =>
    {
      event.preventDefault();
      event.stopPropagation();

      if (!event.dataTransfer.types.includes("Files")) return;

      if (!this.isShowingError)
      {
        this.showDropIndicator();
      }

      if (application.isCanvasEvent(event) && !this.isShowingError)
      {
        container.classList.add("file_drop");
        container.style.cursor = "copy";
        event.dataTransfer.dropEffect = "copy";
      }
      else
      {
        container.classList.remove("file_drop");
        container.style.cursor = "not-allowed";
        event.dataTransfer.dropEffect = "none";
      }
    }, false);

    dragElement.addEventListener("drop", event =>
    {
      event.preventDefault();
      event.stopPropagation();

      this.endDrag();

      if (application.isCanvasEvent(event))
      {
        this.loadFiles(event.dataTransfer.files);
      }
    }, false);


    dragElement.addEventListener("dragleave", event =>
    {
      event.preventDefault();
      event.stopPropagation();

      if (!event.relatedTarget || !body.contains(event.relatedTarget))
      {
        this.endDrag();
      }
    });
  }

  showDropIndicator()
  {
    this.dropIndicator.classList.remove("hidden");
  }

  hideDropIndicator()
  {
    this.dropIndicator.classList.add("hidden");
  }

  endDrag()
  {
    const container = this.application.container;
    container.classList.remove("file_drop");
    container.style.cursor = "";
    this.hideDropIndicator();
  }
}

export { OpenLocalTool };
