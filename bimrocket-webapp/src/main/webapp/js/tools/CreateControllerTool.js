/*
 * CreateControllerTool.js
 *
 * @author: realor
 */
import { Tool } from "./Tool.js";
import { ControllerManager } from "../controllers/ControllerManager.js";
import { Dialog } from "../ui/Dialog.js";
import { Application } from "../ui/Application.js";

class CreateControllerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "create_controller";
    this.label = "tool.create_controller.label";
    this.className = "create_controller";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let object = application.selection.object;

    let dialog = new Dialog(this.label);
    dialog.setSize(500, 400);
    dialog.setI18N(application.i18n);
    let bodyElem = dialog.bodyElem;
    let listElem = document.createElement("ul");
    listElem.className = "controller_list";
    bodyElem.appendChild(listElem);
    let first = true;
    for (let className in ControllerManager.classes)
    {
      let controllerClass = ControllerManager.classes[className];
      let id = "ctrl_" + className;
      let itemElem = document.createElement("li");
      listElem.appendChild(itemElem);

      let labelElem = document.createElement("label");
      labelElem.htmlFor = id;
      itemElem.appendChild(labelElem);

      let inputElem = document.createElement("input");
      inputElem.type = "radio";
      inputElem.name = "controllerClass";
      inputElem.value = className;
      inputElem.id = id;
      if (first) { inputElem.checked = true; first = false; }
      labelElem.appendChild(inputElem);

      let nameSpanElem = document.createElement("span");
      nameSpanElem.className = "type";
      nameSpanElem.innerHTML = controllerClass.type + ":";
      labelElem.appendChild(nameSpanElem);

      let descSpanElem = document.createElement("span");
      descSpanElem.innerHTML = controllerClass.description;
      labelElem.appendChild(descSpanElem);
    }

    dialog.addButton("accept", "button.accept", () =>
    {
      let className =
        document.querySelector('input[name="controllerClass"]:checked').value;
      dialog.hide();
      let controllerClass = ControllerManager.classes[className];
      application.createController(controllerClass, object, null, true);
    });

    dialog.addButton("cancel", "button.cancel", () =>
    {
      dialog.hide();
    });

    dialog.show();
  }
}

export { CreateControllerTool };
