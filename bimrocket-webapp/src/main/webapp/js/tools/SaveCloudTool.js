/* 
 * SaveCloudTool.js
 * 
 * @autor: realor
 */

BIMROCKET.SaveCloudTool = class extends BIMROCKET.IOServiceTool
{
  constructor(application, options)
  {
    super(application);
    this.name = "savecloud";
    this.label = "tool.savecloud.label";
    this.help = "tool.savecloud.help";
    this.className = "savecloud";
    this.saveLabel = "Save";
    this.setOptions(options);

    this.createPanel();  
  }

  setupPanel()
  {
    super.setupPanel();

    this.selectionCheckbox = document.createElement("input");
    this.selectionCheckbox.type = "checkbox";
    this.selectionCheckbox.id = this.name + "_" + this.id + "_selection";

    var selectionLabel = document.createElement("label");
    selectionLabel.innerHTML = "Selection only";
    selectionLabel.setAttribute("for", this.selectionCheckbox.id);

    this.optionsBoxElem.appendChild(this.selectionCheckbox);
    this.optionsBoxElem.appendChild(selectionLabel);

    var scope = this;
    this.saveButtonElem = document.createElement("button");
    this.saveButtonElem.innerHTML = this.saveLabel;
    this.saveButtonElem.addEventListener('click', function(){
      scope.savePath(scope.basePath + "/" + scope.entryInputElem.value);
    });
    this.saveButtonElem.style.display = "none";
    this.buttonsPanelElem.appendChild(this.saveButtonElem);  
  }
  
  activate()
  {
    this.goHome();
    this.panel.visible = true;
  };

  deactivate()
  {
    this.panel.visible = false;
  };

  savePath(path)
  {
    var application = this.application;
    var parts = this.parsePath(path);
    var serviceName = parts[0];
    var servicePath = parts[1];
    // call to service
    var service = application.services[serviceName];
    if (service)
    {
      var object;
      if (this.selectionCheckbox.checked && !application.selection.isEmpty())
      {
        object = application.selection.object;
      }
      else
      {
        object = application.baseObject;
        if (object.children.length > 0)
        {
          // take first child
          object = object.children[0];
        }
      }

      var options = {};
      this.showProgressBar();
      this.saveButtonElem.style.display = "none";
      this.entryInputElem.value = "";
      this.hilight(null);
      var scope = this;
      service.save(object, servicePath, options, function(result) 
      {
        scope.handleSaveResult(path, result);
      });
    }
    else
    {
      var messageDialog = new BIMROCKET.MessageDialog("ERROR", 
        "Invalid service: " + serviceName, "error");
      messageDialog.show();
    }
  }

  showButtons(entryName, entryType)
  {
    if (entryType === BIMROCKET.IOMetadata.COLLECTION)
    {
      this.openButtonElem.innerHTML = this.openLabel;
      this.openButtonElem.style.display = "inline";
      this.saveButtonElem.style.display = "none";
    }
    else
    {
      this.openButtonElem.style.display = "none";
      if (entryName)
      {
        this.saveButtonElem.style.display = "inline";
      }
      else
      {
        this.saveButtonElem.style.display = "none";      
      }
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

      var messageDialog = new BIMROCKET.MessageDialog("INFO", 
        "Save successfull.", "message");
      messageDialog.show();
    }
  }
};
