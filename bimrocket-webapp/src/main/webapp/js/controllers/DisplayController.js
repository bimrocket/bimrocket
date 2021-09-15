/*
 * DisplayController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { ControllerManager } from "./ControllerManager.js";

class DisplayController extends PanelController
{
  static type = "DisplayController";
  static description = "Displays a value on a panel.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.input = this.createProperty("number", "Input value");
    this.units = this.createProperty("string", "Units");
    this.decimals = this.createProperty("number", "Number of decimals", 2);
    this.displayClass = this.createProperty("string", "Display class",
      "default");

    this.createPanel();
  }

  createPanel()
  {
    super.createPanel();

    let panelElem = document.createElement("div");
    panelElem.className = "display " + (this.displayClass.value || "default");
    this.displayElem = document.createElement("div");
    panelElem.appendChild(this.displayElem);

    this.panel.bodyElem.appendChild(panelElem);

    this.update();
  }

  onNodeChanged(event)
  {
    this.panel.visible = this.application.selection.contains(this.object);

    if (event.type === "nodeChanged" && this.input.isBoundTo(event.objects))
    {
      this.update();
    }
  }

  update()
  {
    this.panel.title = this.title.value || "";
    let value = this.input.value;
    let num = parseFloat(value).toFixed(this.decimals.value);
    let units = this.units.value || "";
    this.displayElem.innerHTML = "" + num + " " + units;
  }
}

ControllerManager.addClass(DisplayController);

export { DisplayController };