/*
 * CloudExplorerTool.js
 *
 * @autor: realor
 */

BIMROCKET.CloudExplorerTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "cloud_explorer";
    this.label = "tool.cloud_explorer.label";
    this.help = "tool.cloud_explorer.help";
    this.className = "cloud_explorer";
    this.setOptions(options);
    
    this.createPanel();

    this.basePath = "";
    this.entryName = "";
  }

  createPanel()
  {    
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    this.serviceElem = document.createElement("div");
    this.serviceElem.className = "service_panel";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";

    this.homeButtonElem = document.createElement("div");
    this.homeButtonElem.className = "image_button home";

    this.backButtonElem = document.createElement("div");
    this.backButtonElem.className = "image_button back";

    this.directoryElem = document.createElement("div");
    this.directoryElem.className = "directory";

    this.entriesElem = document.createElement("div");
    this.entriesElem.className = "path_entries";

    this.optionsBoxElem = document.createElement("div");
    this.optionsBoxElem.className = "options_box";

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";

    this.buttonsPanelElem = document.createElement("div");
    this.buttonsPanelElem.className = "buttons_panel";

    this.panel.bodyElem.appendChild(this.serviceElem);

    this.serviceElem.appendChild(this.headerElem);
    this.serviceElem.appendChild(this.entriesElem);
    this.serviceElem.appendChild(this.optionsBoxElem);
    this.serviceElem.appendChild(this.footerElem);

    this.headerElem.appendChild(this.homeButtonElem);
    this.headerElem.appendChild(this.backButtonElem);
    this.headerElem.appendChild(this.directoryElem);

    this.footerElem.appendChild(this.buttonsPanelElem);
    this.showButtonsPanel();

    this.homeButtonElem.addEventListener('click', event => this.goHome());
    this.backButtonElem.addEventListener('click', event => this.goBack());

    this.openButtonElem = document.createElement("button");
    this.openButtonElem.innerHTML = "Open";
    this.openButtonElem.addEventListener('click', event => 
    {
      if (this.entryName.length > 0)
      {
        this.openPath(this.basePath + "/" + this.entryName);
      }
    });
    this.buttonsPanelElem.appendChild(this.openButtonElem);

    this.saveButtonElem = document.createElement("button");
    this.saveButtonElem.innerHTML = "Save";
    this.saveButtonElem.addEventListener('click', event => 
      this.showSaveDialog());
    this.saveButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.saveButtonElem);  

    this.deleteButtonElem = document.createElement("button");
    this.deleteButtonElem.innerHTML = "Delete";
    this.deleteButtonElem.addEventListener('click', event => 
      this.showDeleteDialog());
    this.deleteButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.deleteButtonElem);  
  }
  
  activate()
  {
    if (this.basePath === "") this.goHome();
    this.panel.visible = true;
  }
  
  deactivate()
  {
    this.panel.visible = false;
  }

  openPath(path)
  {
    const application = this.application;
    this.openButtonElem.style.display = "none";
    this.entryName = "";
    this.hilight(null);

    if (path === "/")
    {
      this.showServices();
    }
    else
    {
      const parts = this.parsePath(path);
      const serviceName = parts[0];
      const servicePath = parts[1];
      // call to service
      const service = application.services[serviceName];
      if (service)
      {
        const options = {};
        this.showProgressBar();

        service.open(servicePath, options,
          result => this.handleOpenResult(path, result),
          data => this.setProgress(data.progress, data.message));
      }
      else
      {
        const messageDialog = new BIMROCKET.MessageDialog("ERROR", 
          "Invalid service: " + serviceName, "error");
        messageDialog.show();
      }
    }
  }

  savePath(path)
  {
    const application = this.application;
    const parts = this.parsePath(path);
    const serviceName = parts[0];
    const servicePath = parts[1];
    // call to service
    const service = application.services[serviceName];
    if (service)
    {
      let object = application.selection.object || application.baseObject;

      var options = {};
      this.showProgressBar();
      this.saveButtonElem.style.display = "none";
      this.entryName = "";
      this.hilight(null);
      service.save(object, servicePath, options, result =>  
        this.handleSaveResult(path, result));
    }
    else
    {
      var messageDialog = new BIMROCKET.MessageDialog("ERROR", 
        "Invalid service: " + serviceName, "error");
      messageDialog.show();
    }
  }

  deletePath(path)
  {
    const application = this.application;
    const parts = this.parsePath(path);
    const serviceName = parts[0];
    const servicePath = parts[1];
    // call to service
    const service = application.services[serviceName];
    if (service)
    {
      this.showProgressBar();
      this.saveButtonElem.style.display = "none";
      this.entryName = "";
      this.hilight(null);
      service.remove(servicePath, result =>  
        this.handleDeleteResult(path, result));
    }
    else
    {
      var messageDialog = new BIMROCKET.MessageDialog("ERROR", 
        "Invalid service: " + serviceName, "error");
      messageDialog.show();
    }
  }

  handleOpenResult(path, result)
  {
    this.showButtonsPanel();
    if (result.status === BIMROCKET.IOResult.OK)
    {
      if (result.entries)
      {
        this.showDirectory(path, result);
      }
      else
      {
        this.addObject(result.object);
      }
    }
    else 
    {
      const messageDialog = 
        new BIMROCKET.MessageDialog("ERROR", result.message, "error");
      messageDialog.show();
    }
  }

  handleSaveResult(path, result)
  {
    this.showButtonsPanel();
    if (result.status === BIMROCKET.IOResult.ERROR)
    {
      var messageDialog = new BIMROCKET.MessageDialog("ERROR", 
        result.message, "error");
      messageDialog.show();
    }
    else
    {
      // reload basePath
      this.openPath(this.basePath);

      BIMROCKET.Toast.show("File saved.");
    }
  }

  handleDeleteResult(path, result)
  {
    this.showButtonsPanel();
    if (result.status === BIMROCKET.IOResult.ERROR)
    {
      var messageDialog = new BIMROCKET.MessageDialog("ERROR", 
        result.message, "error");
      messageDialog.show();
    }
    else
    {
      // reload basePath
      this.openPath(this.basePath);

      BIMROCKET.Toast.show("File deleted.");
    }
  }

  showServices()
  {
    const application = this.application;

    this.basePath = "";
    const COLLECTION = BIMROCKET.IOMetadata.COLLECTION;

    this.directoryElem.innerHTML = "/";
    this.entriesElem.innerHTML = "";
    for (let serviceName in application.services)
    {
      let service = application.services[serviceName];
      let entryElem = document.createElement("div");
      entryElem.className = "entry service";
      entryElem.innerHTML = service.description;
      entryElem.addEventListener("click", event => 
        this.onClick(event, service.name, COLLECTION));
      entryElem.addEventListener("dblclick", event =>
        this.onDblClick(event, service.name, COLLECTION));
      this.entriesElem.appendChild(entryElem);
    }
  }

  showDirectory(path, result)
  {
    const application = this.application;

    this.basePath = path;
    const OBJECT = BIMROCKET.IOMetadata.OBJECT;

    if (path.lastIndexOf("/") === 0)
    {
      const serviceName = path.substring(1);
      this.directoryElem.innerHTML = 
        application.services[serviceName].description;
    }
    else
    {
      this.directoryElem.innerHTML = result.metadata.name;
    }
    let entries = result.entries;
    entries.sort(this.entryComparator);
    this.entriesElem.innerHTML = "";
    for (let i = 0; i < entries.length; i++)
    {
      let entry = entries[i];
      let entryElem = document.createElement("div");
      let className = "entry " +
        (entry.type === OBJECT ? "object" : "collection");
      entryElem.className = className;
      entryElem.innerHTML = entry.description;
      entryElem.addEventListener("click", event =>
        this.onClick(event, entry.name, entry.type));
      entryElem.addEventListener("dblclick", event => 
        this.onDblClick(event, entry.name, entry.type));
      this.entriesElem.appendChild(entryElem);
    }
    this.showButtons();
  }

  parsePath(path)
  {
    let serviceName, servicePath;
    let subpath = path.substring(1);
    let index = subpath.indexOf("/");
    if (index !== -1)
    {
      serviceName = subpath.substring(0, index);
      servicePath = subpath.substring(index);
    }
    else
    {
      serviceName = subpath;
      servicePath = "/";
    }
    return [serviceName, servicePath];
  }

  hilight(elem)
  {
    const entriesElem = this.entriesElem;
    for (let i = 0; i < entriesElem.childNodes.length; i++)
    {
      let childNode = entriesElem.childNodes[i];
      if (childNode.nodeName === "DIV")
      {
        let className = childNode.className;
        if (childNode === elem)
        {
          if (className.indexOf("selected") === -1)
          {
            elem.className = "selected " + elem.className;
          }
        }
        else
        {
          if (className.indexOf("selected") !== -1)
          {
            childNode.className = childNode.className.substring(9);
          }
        }
      }
    }
  }

  goHome()
  {
    this.openPath("/");
  };

  goBack()
  {
    var index = this.basePath.lastIndexOf("/");
    if (index === 0)
    {
      this.openPath("/");
    }
    else
    {
      this.openPath(this.basePath.substring(0, index));
    }
  }

  onClick(event, entryName, entryType)
  {
    const elem = event.target || event.srcElement;
    this.hilight(elem);
    this.entryName = entryName;
    this.showButtons(entryType);
  }

  onDblClick(event, entryName, entryType)
  {
    this.entryName = entryName;
    this.processDblClick(entryName, entryType);
  }

  showButtons(entryType)
  {
    if (entryType === BIMROCKET.IOMetadata.COLLECTION)
    {
      this.openButtonElem.style.display = "inline";
      this.saveButtonElem.style.display = "none";
      this.deleteButtonElem.style.display = "inline";      
    }
    else
    {
      this.saveButtonElem.style.display = "inline";
      if (entryType)
      {
        this.openButtonElem.style.display = "inline";
        this.deleteButtonElem.style.display = "inline";
      }
      else
      {
        this.openButtonElem.style.display = "none";    
        this.deleteButtonElem.style.display = "none";      
      }
    }
  }

  processDblClick(entryName, entryType)
  {
    this.openPath(this.basePath + "/" + entryName);
  }

  addObject(object)
  {
    const application = this.application;

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
  }

  showButtonsPanel()
  {
    this.buttonsPanelElem.style.display = "block";
    this.application.progressBar.visible = false;
  }

  showProgressBar()
  {
    this.buttonsPanelElem.style.display = "none";
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;
  }

  setProgress(progress, message)
  {
    this.application.progressBar.progress = progress;
    if (message)
    {
      this.application.progressBar.message = message;    
    }
  }

  entryComparator(a, b)
  {
    var COLLECTION = BIMROCKET.IOMetadata.COLLECTION;
    var OBJECT = BIMROCKET.IOMetadata.OBJECT;  

    if (a.type === COLLECTION && b.type === OBJECT) return -1;
    if (a.type === OBJECT && b.type === COLLECTION) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  }

  showSaveDialog()
  {
    let dialog = new BIMROCKET.SaveDialog("Save to cloud", this.entryName);
    dialog.onSave = (name, format, onlySelection) => 
    {
      this.savePath(this.basePath + "/" + name);
    };
    dialog.show();
  }
  
  showDeleteDialog()
  {
    let name = this.entryName;
    if (name.length > 0)
    {
      let dialog = new BIMROCKET.ConfirmDialog("Delete from cloud", 
        "Delete " + name + "?", 
        () => this.deletePath(this.basePath + "/" + name));

      dialog.show();
    }
  }
};