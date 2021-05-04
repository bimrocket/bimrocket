/*
 * IOServiceTool.js
 *
 * @autor: realor
 */

BIMROCKET.IOServiceTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.openLabel = "Open";
    this.basePath = "";
  }

  createPanel()
  {    
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    var scope = this;

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

    this.entryBoxElem = document.createElement("div");
    this.entryBoxElem.className = "entry_box";

    this.entryInputElem = document.createElement("input");
    this.entryInputElem.type = "text";
    this.entryInputElem.className = "entry_input";

    this.optionsBoxElem = document.createElement("div");
    this.optionsBoxElem.className = "options_box";

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";

    this.buttonsPanelElem = document.createElement("div");
    this.buttonsPanelElem.className = "buttons_panel";

    this.messageElem = document.createElement("div");
    this.messageElem.className = "service_message";
    this.messageElem.innerHTML = "Click on scene to place object...";
    this.messageElem.style.display = "none";

    this.panel.bodyElem.appendChild(this.messageElem);

    this.panel.bodyElem.appendChild(this.serviceElem);

    this.serviceElem.appendChild(this.headerElem);
    this.serviceElem.appendChild(this.entriesElem);
    this.serviceElem.appendChild(this.entryBoxElem);
    this.serviceElem.appendChild(this.optionsBoxElem);
    this.serviceElem.appendChild(this.footerElem);

    this.headerElem.appendChild(this.homeButtonElem);
    this.headerElem.appendChild(this.backButtonElem);
    this.headerElem.appendChild(this.directoryElem);

    this.entryBoxElem.appendChild(this.entryInputElem);

    this.footerElem.appendChild(this.buttonsPanelElem);
    this.showButtonsPanel();

    this.setupPanel();

    this.homeButtonElem.addEventListener('click', function()
    {
      scope.goHome();
    });

    this.backButtonElem.addEventListener('click', function()
    {
      scope.goBack();
    });

    this.entryInputElem.addEventListener('keyup', function()
    {
      var value = scope.entryInputElem.value;
      scope.showButtons(value, null);
    });
  }

  setupPanel()
  {
    var scope = this;
    this.openButtonElem = document.createElement("button");
    this.openButtonElem.innerHTML = this.openLabel;
    this.openButtonElem.addEventListener('click', function()
    {
      var value = scope.entryInputElem.value;
      if (value !== null && value.length > 0)
      {
        scope.openPath(scope.basePath + "/" + value);
      }
    });
    this.buttonsPanelElem.appendChild(this.openButtonElem);
  }

  openPath(path)
  {
    var application = this.application;
    this.openButtonElem.style.display = "none";
    this.entryInputElem.value = "";
    this.hilight(null);

    if (path === "/")
    {
      this.showServices();
    }
    else
    {
      var parts = this.parsePath(path);
      var serviceName = parts[0];
      var servicePath = parts[1];
      // call to service
      var service = application.services[serviceName];
      if (service)
      {
        var options = {};
        var scope = this;
        this.showProgressBar();

        service.open(servicePath, options,
          function(result)
          { scope.handleOpenResult(path, result); },
          function(data)
          { scope.setProgress(data.progress, data.message); });
      }
      else 
      {
        var messageDialog = new BIMROCKET.MessageDialog("ERROR", 
          "Invalid service: " + serviceName, "error");
        messageDialog.show();
      }
    }
  }

  parsePath(path)
  {
    var serviceName, servicePath;
    var subpath = path.substring(1);
    var index = subpath.indexOf("/");
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
        this.processObject(result);
      }
    }
    else 
    {
      var messageDialog = 
        new BIMROCKET.MessageDialog("ERROR", result.message, "error");
      messageDialog.show();
    }
  }

  showServices()
  {
    var scope = this;  
    var application = this.application;

    this.basePath = "";
    var COLLECTION = BIMROCKET.IOMetadata.COLLECTION;

    this.directoryElem.innerHTML = "/";
    this.entriesElem.innerHTML = "";
    for (var serviceName in application.services)
    {
      var service = application.services[serviceName];
      var entryElem = document.createElement("div");
      entryElem.className = "entry service";
      entryElem.innerHTML = service.description;
      entryElem.addEventListener("click", function(service)
      {
        return function(event)
        {
          return scope.onClick(event, service.name, COLLECTION);
        };
      }(service));
      entryElem.addEventListener("dblclick", function(service)
      {
        return function(event)
        {
          return scope.onDblClick(event, service.name, COLLECTION);
        };
      }(service));
      this.entriesElem.appendChild(entryElem);
    }
  }

  showDirectory(path, result)
  {
    var scope = this;
    var application = this.application;

    this.basePath = path;
    var OBJECT = BIMROCKET.IOMetadata.OBJECT;

    if (path.lastIndexOf("/") === 0)
    {
      var serviceName = path.substring(1);
      this.directoryElem.innerHTML = 
        application.services[serviceName].description;
    }
    else
    {
      this.directoryElem.innerHTML = result.metadata.name;
    }
    var entries = result.entries;
    entries.sort(this.entryComparator);
    this.entriesElem.innerHTML = "";
    for (var i = 0; i < entries.length; i++)
    {
      var entry = entries[i];
      var entryElem = document.createElement("div");
      var className = "entry " +
        (entry.type === OBJECT ? "object" : "collection");
      entryElem.className = className;
      entryElem.innerHTML = entry.description;
      entryElem.addEventListener("click", function(entry)
      {
        return function(event)
        {
          return scope.onClick(event, entry.name, entry.type);
        };
      }(entry));
      entryElem.addEventListener("dblclick", function(entry)
      {
        return function(event)
        {
          return scope.onDblClick(event, entry.name, entry.type);
        };
      }(entry));
      this.entriesElem.appendChild(entryElem);
    }
  }

  hilight(elem)
  {
    var entriesElem = this.entriesElem;
    for (var i = 0; i < entriesElem.childNodes.length; i++)
    {
      var childNode = entriesElem.childNodes[i];
      if (childNode.nodeName === "DIV")
      {
        var className = childNode.className;
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
    var elem = event.target || event.srcElement;
    this.hilight(elem);
    this.entryInputElem.value = entryName;
    this.showButtons(entryName, entryType);
  }

  onDblClick(event, entryName, entryType)
  {
    this.entryInputElem.value = entryName;
    this.processDblClick(entryName, entryType);
  }

  showButtons(entryName, entryType)
  {
    if (entryType === BIMROCKET.IOMetadata.COLLECTION)
    {
      this.openButtonElem.innerHTML = this.openLabel;
      this.openButtonElem.style.display = "inline";
    }
    else
    {
      this.openButtonElem.style.display = "none";
    }
  }

  processDblClick(entryName, entryType)
  {
    if (entryType === BIMROCKET.IOMetadata.COLLECTION)
    {
      this.openPath(this.basePath + "/" + entryName);
    }
  }

  processObject(result)
  {
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
};