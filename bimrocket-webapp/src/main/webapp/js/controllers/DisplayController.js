/*
 * DisplayController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { Controller } from "./Controller.js";

class DisplayController extends PanelController
{
  constructor(object, name)
  {
    super(object, name);

    this.input = 0;
    this.units = "meters";
    this.decimals = 2;
    this.displayClass = "default";
  }

  createPanel()
  {
    super.createPanel();

    let panelElem = document.createElement("div");
    panelElem.className = "display " + (this.displayClass || "default");
    this.displayElem = document.createElement("div");
    panelElem.appendChild(this.displayElem);

    this.panel.bodyElem.appendChild(panelElem);

    this.update();
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
    this.panel.visible = this.application.selection.contains(this.object);
    let value = this.input;
    let num = parseFloat(value).toFixed(this.decimals);
    let units = this.units || "";
    this.displayElem.innerHTML = "" + num + " " + units;
  }
}

Controller.addClass(DisplayController);

export { DisplayController };