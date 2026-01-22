/*
 * DragDropHandler.js
 *
 */

import { IOManager } from "../io/IOManager.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { MessageDialog } from "../ui/MessageDialog.js";

class DragDropHandler
{
  constructor(application)
  {
    this.application = application;
    this.container = application.container;
    this.enabled = true;
    this.dropOverlay = null;
    this.isInsideValidArea = false;

    this.fileQueue = [];
    this.isProcessingQueue = false;

    this._onDragOver = this.onDragOver.bind(this);
    this._onDragLeave = this.onDragLeave.bind(this);
    this._onDrop = this.onDrop.bind(this);

    this.addEventListeners();
  }

  addEventListeners()
  {
    this.container.addEventListener("dragover", this._onDragOver, false);
    this.container.addEventListener("dragleave", this._onDragLeave, false);
    this.container.addEventListener("drop", this._onDrop, false);
  }

  removeEventListeners()
  {
    this.container.removeEventListener("dragover", this._onDragOver, false);
    this.container.removeEventListener("dragleave", this._onDragLeave, false);
    this.container.removeEventListener("drop", this._onDrop, false);
  }

  onDragOver(event)
  {
    if (!this.enabled) return;

    event.preventDefault();

    const canHandle = this.shouldHandleEvent(event);
    const wasInside = this.isInsideValidArea;
    this.isInsideValidArea = canHandle;

    if (canHandle)
    {
      event.dataTransfer.dropEffect = "copy";
    }
    else
    {
      event.dataTransfer.dropEffect = "none";
    }

    if (!this.dropOverlay)
    {
      this.showDropOverlay();
    }

    if (wasInside !== canHandle)
    {
      this.updateDropOverlayState();
    }
  }

  onDragLeave(event)
  {
    if (!this.enabled) return;

    event.preventDefault();

    const rect = this.container.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom)
    {
      this.isInsideValidArea = false;
      this.hideDropOverlay();
    }
  }

  onDrop(event)
  {
    if (!this.enabled) return;

    event.preventDefault();
    this.hideDropOverlay();

    const files = event.dataTransfer.files;
    if (files.length === 0) return;

    if (this.shouldHandleEvent(event))
    {
      this.enqueueFiles(files);
    }
  }

  shouldHandleEvent(event)
  {
    let elem = event.target;
    while (elem && elem !== this.container)
    {
      if (elem.classList.contains("panel") ||
          elem.classList.contains("resizer") ||
          elem.classList.contains("service_panel") ||
          elem.classList.contains("toolbar") ||
          elem.tagName === "HEADER")
      {
        return false;
      }
      elem = elem.parentElement;
    }
    return elem === this.container;
  }

  updateDropOverlayState()
  {
    if (this.dropOverlay)
    {
      if (this.isInsideValidArea)
      {
        this.dropOverlay.classList.remove("outside");
        this.dropOverlay.classList.add("inside");
      }
      else
      {
        this.dropOverlay.classList.remove("inside");
        this.dropOverlay.classList.add("outside");
      }
    }
  }

  showDropOverlay()
  {
    const overlay = document.createElement("div");
    overlay.className = "drop_overlay " + (this.isInsideValidArea ? "inside" : "outside");

    const messageDiv = document.createElement("div");
    messageDiv.className = "drop_message";

    const iconDiv = document.createElement("div");
    iconDiv.className = "drop_icon";

    const textDiv = document.createElement("div");
    textDiv.className = "drop_text";
    textDiv.textContent = this.application.i18n.get("drop.text");

    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(textDiv);
    overlay.appendChild(messageDiv);

    this.container.appendChild(overlay);
    this.dropOverlay = overlay;
  }

  hideDropOverlay()
  {
    if (this.dropOverlay)
    {
      this.dropOverlay.remove();
      this.dropOverlay = null;
    }
  }

  enqueueFiles(files)
  {
    const validFiles = this.validateFiles(files);
    if (validFiles.length === 0)
    {
      MessageDialog.create("ERROR", "drop.error.invalid_files")
        .setClassName("error")
        .setI18N(this.application.i18n)
        .show();
      return;
    }

    for (let i = 0; i < validFiles.length; i++)
    {
      this.fileQueue.push(validFiles[i]);
    }

    if (!this.isProcessingQueue)
    {
      this.processQueue();
    }
  }

  async processQueue()
  {
    if (this.fileQueue.length === 0)
    {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;

    while (this.fileQueue.length > 0)
    {
      const file = this.fileQueue.shift();
      await this.loadFile(file);
    }

    this.isProcessingQueue = false;
  }

  validateFiles(files)
  {
    const validFiles = [];
    const supportedExtensions = IOManager.getSupportedLoaderExtensions();

    for (let i = 0; i < files.length; i++)
    {
      const file = files[i];
      const extension = this.getFileExtension(file.name);
      if (supportedExtensions.includes(extension))
      {
        validFiles.push(file);
      }
    }
    return validFiles;
  }

  getFileExtension(fileName)
  {
    const index = fileName.lastIndexOf(".");
    if (index !== -1)
    {
      return fileName.substring(index + 1).toLowerCase();
    }
    return "";
  }

  loadFile(file)
  {
    return new Promise((resolve, reject) =>
    {
      const application = this.application;
      const reader = new FileReader();

      reader.onload = evt =>
      {
        const data = evt.target.result;
        const intent =
        {
          url: "file://" + file.name,
          data: data,
          onProgress: data =>
          {
            application.progressBar.progress = data.progress;
            application.progressBar.message = data.message;
          },
          onCompleted: object =>
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

            resolve(object);
          },
          onError: error =>
          {
            console.error(error);
            application.progressBar.visible = false;
            MessageDialog.create("ERROR", error)
              .setClassName("error")
              .setI18N(application.i18n)
              .show();
            reject(error);
          },
          manager: application.loadingManager,
          units: application.setup.units
        };
        IOManager.load(intent);
      };

      application.progressBar.message = "Loading file...";
      application.progressBar.progress = undefined;
      application.progressBar.visible = true;

      const formatInfo = IOManager.getFormatInfo(file.name);
      if (formatInfo?.dataType === "arraybuffer")
      {
        reader.readAsArrayBuffer(file);
      }
      else
      {
        reader.readAsText(file);
      }
    });
  }

  destroy()
  {
    this.removeEventListeners();
    this.hideDropOverlay();
    this.fileQueue = [];
  }
}

export { DragDropHandler };
