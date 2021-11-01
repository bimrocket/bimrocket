/*
 * DisplayController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { Controller } from "./Controller.js";
import { Controls } from "../ui/Controls.js";
import { I18N } from "../i18n/I18N.js";

class DisplayController extends PanelController
{
  constructor(object, name)
  {
    super(object, name);

    this.input = 0;
    this.units = "meters";
    this.decimals = 2;
    this.detailUrl = "";
    this.detailTarget = "_blank";
    this.detailLabel = "Show more";
    this.displayClass = "default";
  }

  createPanel()
  {
    super.createPanel("left", 80);

    let panelElem = document.createElement("div");
    panelElem.className = "display " + (this.displayClass || "default");
    this.displayElem = document.createElement("div");
    panelElem.appendChild(this.displayElem);

    this.panel.bodyElem.appendChild(panelElem);

    this.detailButton = Controls.addButton(this.panel.bodyElem, "detail",
      this.detailLabel, () => this.openUrl(), "detail");
    this.detailButton.style.display = "none";

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
    let value = this.input;
    let num = parseFloat(value).toFixed(this.decimals);
    let units = this.units || "";
    this.displayElem.innerHTML = "" + num + " " + units;
    if (this.detailUrl.length > 0)
    {
      this.detailButton.style.display = "";
      I18N.set(this.detailButton, "innerHTML", this.detailLabel);
    }
  }

  openUrl()
  {
    window.open(this.detailUrl, this.detailTarget).focus();
  }
}

Controller.addClass(DisplayController);

export { DisplayController };