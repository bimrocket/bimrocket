/*
 * ToggleButtonController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { ControllerManager } from "./ControllerManager.js";

class ToggleButtonController extends PanelController
{
  static type = "ToggleButtonController";
  static description = "Shows a toggle button.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.output = this.createProperty("number", "Output value");
    this.valueOff = this.createProperty("number", "Value off", 0);
    this.valueOn = this.createProperty("number", "Value on", 1);
    this.buttonClass = this.createProperty("string", "Button class",
      "toggle_button");

    this._onValueChange = this.onValueChange.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    super.createPanel("left", 150);

    let buttonElem = document.createElement("span");
    this.buttonElem = buttonElem;
    buttonElem.setAttribute("role", "button");
    let inputElem = document.createElement("input");
    this.inputElem = inputElem;
    inputElem.type = "checkbox";
    inputElem.checked = parseInt(this.output.value) === this.valueOn.value;
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
    this.output.value = this.inputElem.checked ?
      this.valueOn.value : this.valueOff.value;
  }

  onNodeChanged(event)
  {
    this.panel.visible = this.application.selection.contains(this.object);

    if (event.type === "nodeChanged" && event.objects.includes(this.object))
    {
      this.update();
    }
  }

  update()
  {
    this.panel.title = this.title.value || "";
    this.buttonElem.className = this.buttonClass.value || "toggle_button";
  }
}

ControllerManager.addClass(ToggleButtonController);

export { ToggleButtonController };