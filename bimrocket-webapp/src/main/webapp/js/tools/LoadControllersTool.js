/*
 * LoadControllersTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { ControllerManager } from "../controllers/ControllerManager.js";
import { MessageDialog } from "../ui/MessageDialog.js";

class LoadControllersTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "load_controllers";
    this.label = "tool.load_controllers.label";
    this.className = "load_controllers";
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
      reader.onload = evt =>
      {
        let data = evt.target.result;
        this.loadControllers(data);
      };
      reader.readAsText(file);
    }
  }

  onFocus(event)
  {
    this.application.useTool(null);
  }

  loadControllers(text)
  {
    const application = this.application;
    const scene = application.scene;
    let data = JSON.parse(text);
    let count = 0;
    for (let i = 0; i < data.length; i++)
    {
      let objectData = data[i];
      let name = objectData.name;
      let object = scene.getObjectByName(name);
      if (object)
      {
        let controllersData = objectData.controllers;
        for (let c = 0; c < controllersData.length; c++)
        {
          count++;
          let controllerData = controllersData[c];
          let controllerClass = ControllerManager.classes[controllerData.type];
          let controllerName = controllerData.name;
          let controller = application.createController(controllerClass,
            object, controllerName);
          for (let k = 0; k < controllerData.properties.length; k++)
          {
            let propertyData = controllerData.properties[k];
            let propertyName = propertyData.name;
            let property = controller[propertyName];
            property.definition = propertyData.definition || null;
            property.value = propertyData.value;
          }
        }
      }
      else
      {
        console.warn("Object not found", name);
      }
    }
    MessageDialog.create(this.label, "message.controllers_loaded", count)
      .setClassName("info")
      .setI18N(application.i18n).show();
  }
}

export { LoadControllersTool };
