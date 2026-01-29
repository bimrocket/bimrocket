/*
 * OpenLocalTool.js
 *
 * @author realor
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
    this.setOptions(options);
    application.addTool(this);

    this._onChange = this.onChange.bind(this);
    this._onFocus = this.onFocus.bind(this);

    this.fileQueue = [];
    this.isProcessing = false;

    this.createDropIndicator();
    this.registerDragAndDrop();
  }

  createDropIndicator()
  {
    const container = this.application.container;

    const dropIndicator = document.createElement("div");
    dropIndicator.className = "drop-indicator";

    const text = document.createElement("div");
    text.className = "drop-text";
    I18N.set(text, "textContent", "tool.openlocal.drop_here");
    dropIndicator.appendChild(text);

    container.appendChild(dropIndicator);
    this.dropIndicator = dropIndicator;

    const noDropIndicator = document.createElement("div");
    noDropIndicator.className = "no-drop-indicator";

    const noDropText = document.createElement("div");
    noDropText.className = "no-drop-text";
    I18N.set(noDropText, "textContent", "tool.openlocal.no_drop");
    noDropIndicator.appendChild(noDropText);

    container.appendChild(noDropIndicator);
    this.noDropIndicator = noDropIndicator;

    this.application.i18n.update(dropIndicator);
    this.application.i18n.update(noDropIndicator);
  }

  showDropIndicator()
  {
    if (this.dropIndicator)
    {
      this.dropIndicator.style.display = "block";
    }
    if (this.noDropIndicator)
    {
      this.noDropIndicator.style.display = "none";
    }
    const canvas = this.application.container.querySelector('canvas');
    if (canvas)
    {
      canvas.style.opacity = "0.85";
    }
  }

  hideDropIndicator()
  {
    if (this.dropIndicator)
    {
      this.dropIndicator.style.display = "none";
    }
    if (this.noDropIndicator)
    {
      this.noDropIndicator.style.display = "none";
    }
    const canvas = this.application.container.querySelector('canvas');
    if (canvas)
    {
      canvas.style.opacity = "";
    }
  }

  showNoDropIndicator()
  {
    if (this.dropIndicator)
    {
      this.dropIndicator.style.display = "none";
    }
    if (this.noDropIndicator)
    {
      this.noDropIndicator.style.display = "block";
    }
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
    let files = this.inputFile.files;
    if (files.length > 0)
    {
      for (let i = 0; i < files.length; i++)
      {
        this.fileQueue.push(files[i]);
      }
      this.processQueue();
    }
  }

  processQueue()
  {
    if (this.isProcessing || this.fileQueue.length === 0)
    {
      return;
    }

    this.isProcessing = true;
    const file = this.fileQueue.shift();
    this.uploadFile(file);
  }

  uploadFile(file)
  {
    if (!this.isValidFile(file))
    {
      const message = this.application.i18n.get("message.file_open_error", file.name, "Unsupported format");
      MessageDialog.create("ERROR", message)
        .setClassName("error")
        .setAction(() =>
        {
          this.isProcessing = false;
          this.processQueue();
        })
        .setI18N(this.application.i18n).show();
      return;
    }

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

          this.isProcessing = false;
          this.processQueue();
        },
        onError : error =>
        {
          console.error(error);

          const errorMessage = String(error);
          const message = application.i18n.get("message.file_open_error", file.name, errorMessage);
          MessageDialog.create("ERROR", message)
            .setClassName("error")
            .setAction(() =>
            {
              this.isProcessing = false;
              this.processQueue();
            })
            .setI18N(this.application.i18n).show();
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

  isValidFile(file)
  {
    const supportedExtensions = IOManager.getSupportedLoaderExtensions();
    const fileName = file.name.toLowerCase();
    const hasValidExtension = supportedExtensions.some(ext =>
      fileName.endsWith("." + ext.toLowerCase())
    );

    if (!hasValidExtension)
    {
      console.warn("File type not supported: " + file.name);
    }

    return hasValidExtension;
  }

  registerDragAndDrop()
  {
    const container = this.application.container;
    const application = this.application;

    let isOverCanvas = false;

    container.addEventListener('dragenter', e =>
    {
      e.preventDefault();
      e.stopPropagation();

      if (application.isCanvasEvent(e))
      {
        isOverCanvas = true;
        container.style.backgroundColor = "rgba(255, 128, 128, 0.08)";
        container.style.border = "2px dashed #ff8080";
        container.style.boxShadow = "inset 0 0 10px rgba(255, 128, 128, 0.15)";
        container.style.cursor = "copy";
        this.showDropIndicator();
        e.dataTransfer.dropEffect = 'copy';
      }
      else
      {
        isOverCanvas = false;
        container.style.cursor = "not-allowed";
        this.showNoDropIndicator();
        e.dataTransfer.dropEffect = 'none';
      }
    }, false);

    container.addEventListener('dragover', e =>
    {
      e.preventDefault();
      e.stopPropagation();

      if (application.isCanvasEvent(e))
      {
        if (!isOverCanvas)
        {
          isOverCanvas = true;
          container.style.cursor = "copy";
          this.showDropIndicator();
        }
        e.dataTransfer.dropEffect = 'copy';
      }
      else
      {
        if (isOverCanvas)
        {
          isOverCanvas = false;
          container.style.cursor = "not-allowed";
          this.showNoDropIndicator();
        }
        e.dataTransfer.dropEffect = 'none';
      }
    }, false);

    container.addEventListener('drop', e =>
    {
      e.preventDefault();
      e.stopPropagation();

      isOverCanvas = false;
      this.clearContainerStyles();
      this.hideDropIndicator();

      if (application.isCanvasEvent(e))
      {
        const files = e.dataTransfer.files;
        if (files.length > 0)
        {
          Array.from(files).forEach(file => this.fileQueue.push(file));
          this.processQueue();
        }
      }
    }, false);

    this._boundDragEndHandler = this._boundDragEndHandler || (() =>
    {
      isOverCanvas = false;
      this.clearContainerStyles();
      this.hideDropIndicator();
    });
    window.addEventListener('dragend', this._boundDragEndHandler, false);

    container.addEventListener('dragleave', e =>
    {
      if (!e.relatedTarget || !container.contains(e.relatedTarget))
      {
        isOverCanvas = false;
        this.clearContainerStyles();
        this.hideDropIndicator();
      }
    }, false);
  }

  clearContainerStyles()
  {
    const container = this.application.container;
    container.style.backgroundColor = "";
    container.style.border = "";
    container.style.boxShadow = "";
    container.style.cursor = "";
  }
}

export { OpenLocalTool };
