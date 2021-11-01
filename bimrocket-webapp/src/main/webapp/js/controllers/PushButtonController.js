/*
 * PushButtonController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { Controller } from "./Controller.js";

class PushButtonController extends PanelController
{
  constructor(object, name)
  {
    super(object, name);

    this.output = 0;
    this.valueUp = 0;
    this.valueDown = 1;
    this.label = "PUSH";
    this.buttonClass = "rounded_button";
    this.height = 150;

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._pressed = false;
  }

  createPanel()
  {
    super.createPanel("left", 150);

    let buttonElem = document.createElement("div");
    this.buttonElem = buttonElem;

    buttonElem.addEventListener('pointerdown', this._onPointerDown, false);
    buttonElem.addEventListener('pointerup', this._onPointerUp, false);

    this.panel.bodyElem.appendChild(buttonElem);

    this.update();
  }

  onPointerDown(event)
  {
    this._pressed = true;
    this.output = this.valueDown;
    this.application.notifyObjectsChanged(this.object, this);
  }

  onPointerUp(event)
  {
    this._pressed = false;
    this.output = this.valueUp;
    this.application.notifyObjectsChanged(this.object, this);
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
    this.buttonElem.innerHTML = this.label || 'PUSH';
    this.buttonElem.className = this.buttonClass || "rounded_button";
    let output = this._pressed ? this.valueDown : this.valueUp;
    if (output !== this.output)
    {
      this.output = output;
      this.application.notifyObjectsChanged(this.object, this);
    }
  }
}

Controller.addClass(PushButtonController);

export { PushButtonController };