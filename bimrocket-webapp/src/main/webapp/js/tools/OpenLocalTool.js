/*
 * OpenLocalTool.js
 *
 * @autor: realor
 */

BIMROCKET.OpenLocalTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "openlocal";
    this.label = "tool.openlocal.label";
    this.help = "tool.openlocal.help";
    this.className = "openlocal";
    this.setOptions(options);

    this._onChange = this.onChange.bind(this);
    this._onFocus = this.onFocus.bind(this);
  }

  activate()
  {
    let inputFile = document.createElement("input");
    this.inputFile = inputFile;

    inputFile.type = "file";
    inputFile.id = this.name + "_file";

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
      reader.onload = function(evt)
      {
        const t1 = Date.now();
        console.info("File read as text in " + (t1 - t0) + " millis.");

        let data = evt.target.result;
        let intent =
        {
          url : "file://" + file.name,
          data : data,
          onProgress : function(data)
          {
            application.progressBar.progress = data.progress;
            application.progressBar.message = data.message;
          },
          onCompleted : function(object)
          {
            object.updateMatrix();

            application.addObject(object, application.baseObject);
            let container = application.container;
            let aspect = container.clientWidth / container.clientHeight;
            let camera = application.camera;

            object.updateMatrixWorld(true);
            BIMROCKET.ObjectUtils.zoomAll(camera, object, aspect);

            let changeEvent = {type: "nodeChanged", objects: [camera], 
              source : this};
            application.notifyEventListeners("scene", changeEvent);
            application.progressBar.visible = false;
          },
          onError : function(error)
          {
            application.progressBar.visible = false;
            let messageDialog = 
              new BIMROCKET.MessageDialog("ERROR", error, "error");
            messageDialog.show();
          },
          options : { units : application.units }
        };
        BIMROCKET.IOManager.load(intent); // async load
      };
      application.progressBar.message = "Loading file...";
      application.progressBar.progress = undefined;
      application.progressBar.visible = true;
      reader.readAsText(file);
    }
  }
  
  onFocus(event)
  {
    this.application.useTool(null);
  }
};
