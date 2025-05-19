/*
 * ToggleButtonController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { Controller } from "./Controller.js";

class ToggleButtonController extends PanelController
{
  constructor(object, name)
  {
    super(object, name);

    this.input = 0;
    this.output = 0;
    this.valueOff = 0;
    this.valueOn = 1;
    this.buttonClass = "toggle_button";
    this.height = 150;
    this.controllerToExecute = ""; // name of controller to execute

    this._onValueChange = this.onValueChange.bind(this);
    this._input = null;
  }

  createPanel()
  {
    super.createPanel("left");

    let buttonElem = document.createElement("span");
    this.buttonElem = buttonElem;
    buttonElem.setAttribute("role", "button");
    let inputElem = document.createElement("input");
    this.inputElem = inputElem;
    inputElem.type = "checkbox";
    inputElem.checked = parseInt(this.output) === this.valueOn;
    buttonElem.appendChild(inputElem);

    let labelElem = document.createElement("label");
    labelElem.setAttribute("data-off", "OFF");
    labelElem.setAttribute("data-on", "ON");
    buttonElem.appendChild(labelElem);

    this.panel.bodyElem.appendChild(buttonElem);

    inputElem.addEventListener('change', this._onValueChange, false);

    this.update();
  }

  onValueChange(event)
  {
    this.output = this.inputElem.checked ? this.valueOn : this.valueOff;
    this.application.notifyObjectsChanged(this.object, this);
    this.executeController(this.controllerToExecute);
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      this.update();
    }
  }

  update()
  {
    this.panel.title = this.title || "";
    this.buttonElem.className = this.buttonClass || "toggle_button";

    if (this._input !== this.input)
    {
      this.inputElem.checked = this.input === this.valueOn;
      this.output = this.input;
      this._input = this.input;
      this.application.notifyObjectsChanged(this.object, this);
    }
    else
    {
      let value = this.inputElem.checked ? this.valueOn : this.valueOff;
      if (value !== this.output)
      {
        this.output = value;
        this.application.notifyObjectsChanged(this.object, this);
      }
    }
  }
}

Controller.addClass(ToggleButtonController);

export { ToggleButtonController };
