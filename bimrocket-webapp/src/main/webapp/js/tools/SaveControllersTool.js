/*
 * SaveControllersTool.js
 *
 * @autor: realor
 */

BIMROCKET.SaveControllersTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "save_controllers";
    this.label = "tool.save_controllers.label";
    this.help = "tool.save_controllers.help";
    this.className = "save_controllers";
    this.url = null;
    this.setOptions(options);

    this._onClickSave = this.onClickSave.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    this.filenameElem = document.createElement("input");
    this.filenameElem.type = "text";
    this.filenameElem.value = "scene.ctl";
    this.filenameElem.id = this.name + "_" + this.id + "_filename";
    this.panel.bodyElem.appendChild(this.filenameElem);

    this.saveButton = document.createElement("button");
    this.saveButton.innerHTML = "Save";
    this.saveButton.id = this.name + "_" + this.id + "_save";
    this.panel.bodyElem.appendChild(this.saveButton);

    this.saveButton.addEventListener("click", this._onClickSave, false);
  }

  activate()
  {
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  onClickSave(event)
  {
    if (this.url)
    {
      window.URL.revokeObjectURL(this.url);
    }  
    try
    {
      let data = this.saveControllers();
      this.url = window.URL.createObjectURL(data);

      let filename = this.filenameElem.value;

      let linkElem = document.createElement("a");
      linkElem.download = filename;
      linkElem.target = "_blank";
      linkElem.href = this.url;
      linkElem.style.display = "block";
      linkElem.click();
    }
    catch (ex)
    {
      let messageDialog = new BIMROCKET.MessageDialog("ERROR", ex, "error");
      messageDialog.show();
    }
  }
  
  saveControllers()
  {
    let scene = this.application.scene;
    let data = [];
    
    scene.traverse(function(object)
    {
      if (object.controllers)
      {
        let objectData = { name : object.name, controllers : [] };
        data.push(objectData);
        
        for (let i = 0; i < object.controllers.length; i++)
        {
          let controller = object.controllers[i];
          let controllerData = { name : controller.name,
            type : controller.constructor.type,
            properties : []
          };
          objectData.controllers.push(controllerData);
          for (let propertyName in controller)
          {
            let property = controller[propertyName];
            if (property instanceof BIMROCKET.Expression)
            {
              controllerData.properties.push({
                name : propertyName,
                value : property.value, 
                definition : property.definition 
              });
            }
          }          
        }
      }
    });
    
    return new Blob([JSON.stringify(data, null, 2)], 
      {type: 'application/json'});
  }
};
