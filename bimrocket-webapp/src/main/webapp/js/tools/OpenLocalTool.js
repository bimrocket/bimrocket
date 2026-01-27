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
    dropIndicator.style.display = "none";
    dropIndicator.style.position = "absolute";
    dropIndicator.style.top = "50%";
    dropIndicator.style.left = "50%";
    dropIndicator.style.transform = "translate(-50%, -50%)";
    dropIndicator.style.zIndex = "100";
    dropIndicator.style.pointerEvents = "none";

    const text = document.createElement("div");
    text.className = "drop-text";
    text.style.fontFamily = "Montserrat, Arial";
    text.style.fontSize = "14px";
    text.style.color = "#404040";
    text.style.backgroundColor = "#f0f0f0";
    text.style.padding = "8px 16px";
    text.style.borderRadius = "3px";
    text.style.border = "1px solid #ff8080";
    text.style.boxShadow = "0px 0px 3px 0px rgba(50, 50, 50, 0.2)";

    I18N.set(text, "textContent", "tool.openlocal.drop_here");
    dropIndicator.appendChild(text);

    container.appendChild(dropIndicator);
    this.dropIndicator = dropIndicator;

    const noDropIndicator = document.createElement("div");
    noDropIndicator.className = "no-drop-indicator";
    noDropIndicator.style.display = "none";
    noDropIndicator.style.position = "absolute";
    noDropIndicator.style.top = "50%";
    noDropIndicator.style.left = "50%";
    noDropIndicator.style.transform = "translate(-50%, -50%)";
    noDropIndicator.style.zIndex = "100";
    noDropIndicator.style.pointerEvents = "none";

    const noDropText = document.createElement("div");
    noDropText.className = "no-drop-text";
    noDropText.style.fontFamily = "Montserrat, Arial";
    noDropText.style.fontSize = "13px";
    noDropText.style.color = "#606060";
    noDropText.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
    noDropText.style.padding = "6px 12px";
    noDropText.style.borderRadius = "2px";
    noDropText.style.border = "1px solid #c0c0c0";
    noDropText.style.boxShadow = "0px 0px 3px 0px rgba(50, 50, 50, 0.2)";

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
          application.progressBar.visible = false;
          MessageDialog.create("ERROR", error)
            .setClassName("error")
            .setI18N(application.i18n).show();

          this.isProcessing = false;
          this.processQueue();
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

  onFocus(event)
  {
    this.application.useTool(null);
  }
  
  isCanvasEvent(event)
  {
    let elem = event.target;

    while (elem && elem !== this.application.container)
    {

      if (elem.classList.contains("panel") ||
          elem.classList.contains("resizer") ||
          elem.classList.contains("menubar") ||
          elem.classList.contains("toolbar"))
      {
        return false;
      }
      elem = elem.parentElement;
    }
    return elem === this.application.container;
  }

 
  isPanelEvent(event)
  {
    let elem = event.target;

    while (elem && elem !== this.application.container)
    {
      if (elem.classList.contains("panel") ||
          elem.classList.contains("resizer") ||
          elem.classList.contains("menubar") ||
          elem.classList.contains("toolbar"))
      {
        return true;
      }
      elem = elem.parentElement;
    }
    return false;
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

    // Prevent default drag behaviors for ALL events in container
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName =>
    {
      container.addEventListener(eventName, e =>
      {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    container.addEventListener('dragenter', e =>
    {
      if (this.isCanvasEvent(e))
      {
        container.style.backgroundColor = "rgba(255, 128, 128, 0.08)";
        container.style.border = "2px dashed #ff8080";
        container.style.boxShadow = "inset 0 0 10px rgba(255, 128, 128, 0.15)";
        this.showDropIndicator();
        e.dataTransfer.dropEffect = 'copy';
      }
      else if (this.isPanelEvent(e))
      {
        container.style.cursor = "not-allowed";
        this.showNoDropIndicator();
        e.dataTransfer.dropEffect = 'none';
      }
    }, false);

    container.addEventListener('dragover', e =>
    {
      if (this.isCanvasEvent(e))
      {
        e.dataTransfer.dropEffect = 'copy';
        this.showDropIndicator();
      }
      else if (this.isPanelEvent(e))
      {
        e.dataTransfer.dropEffect = 'none';
        this.showNoDropIndicator();
      }
    }, false);

    container.addEventListener('drop', e =>
    {
      this.clearContainerStyles();
      this.hideDropIndicator();

      if (this.isCanvasEvent(e))
      {
        const files = e.dataTransfer.files;
        if (files.length > 0)
        {
          const validFiles = Array.from(files).filter(file => this.isValidFile(file));

          if (validFiles.length === 0)
          {
            MessageDialog.create("WARNING", "No supported files found. Please drag IFC files.")
              .setClassName("warning")
              .setI18N(this.application.i18n)
              .show();
            return;
          }

          if (validFiles.length < files.length)
          {
            MessageDialog.create("INFO",
              `${validFiles.length} of ${files.length} files will be loaded. Unsupported files were skipped.`)
              .setClassName("info")
              .setI18N(this.application.i18n)
              .show();
          }

          validFiles.forEach(file => this.fileQueue.push(file));
          this.processQueue();
        }
      }
    }, false);

    this._boundDragEndHandler = this._boundDragEndHandler || (() =>
    {
      this.clearContainerStyles();
      this.hideDropIndicator();
    });
    window.addEventListener('dragend', this._boundDragEndHandler, false);

    container.addEventListener('dragleave', e =>
    {
      if (!e.relatedTarget || !container.contains(e.relatedTarget))
      {
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
