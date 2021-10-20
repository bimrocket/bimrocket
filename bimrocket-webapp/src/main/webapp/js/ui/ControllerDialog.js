/*
 * ControllerDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Controller } from "../controllers/Controller.js";
import { I18N } from "../i18n/I18N.js";

class ControllerDialog extends Dialog
{
  constructor(application, object)
  {
    super("title.add_controller");
    this.application = application;
    this.object = object;
    this.setI18N(this.application.i18n);

    this.setSize(500, 420);

    this.nameElem = this.addTextField("controller_name", "label.name");

    let listElem = document.createElement("ul");
    listElem.className = "controller_list";
    this.bodyElem.appendChild(listElem);
    let first = true;
    for (let className in Controller.classes)
    {
      let controllerClass = Controller.classes[className];
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
      nameSpanElem.innerHTML = controllerClass.name + ":";
      labelElem.appendChild(nameSpanElem);

      let descSpanElem = document.createElement("span");
      I18N.set(descSpanElem, "innerHTML", controllerClass.getDescription());
      labelElem.appendChild(descSpanElem);
    }

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.addButton("cancel", "button.cancel", () =>
    {
      this.onCancel();
    });
  }

  onShow()
  {
    this.nameElem.focus();
  }

  onAccept()
  {
    let className =
      document.querySelector('input[name="controllerClass"]:checked').value;
    let controllerClass = Controller.classes[className];
    let name = this.nameElem.value;
    this.application.createController(controllerClass, this.object, name);
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }
}

export { ControllerDialog };


