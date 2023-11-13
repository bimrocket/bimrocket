/*
 * ControllerDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
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

    this.bodyElem.classList.add("controller_dialog");

    this.nameElem = this.addTextField("controller_name", "label.name");

    this.typeElem = document.createElement("div");
    I18N.set(this.typeElem, "textContent", "label.controller_type");
    this.bodyElem.appendChild(this.typeElem);

    let listElem = document.createElement("ul");
    this.bodyElem.appendChild(listElem);
    let first = true;
    for (let className in Controller.classes)
    {
      let inputElem = this.addItem(className, listElem);
      if (first)
      {
        inputElem.checked = true;
        first = false;
      }
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

  addItem(className, listElem)
  {
    let id = Controls.getNextId();
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
    labelElem.appendChild(inputElem);

    let nameSpanElem = document.createElement("span");
    nameSpanElem.className = "type";
    nameSpanElem.textContent = className + ":";
    labelElem.appendChild(nameSpanElem);

    const controllerClass = Controller.classes[className];
    let descSpanElem = document.createElement("span");
    I18N.set(descSpanElem, "textContent", controllerClass.getDescription());
    labelElem.appendChild(descSpanElem);

    return inputElem;
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


