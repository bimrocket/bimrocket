/*
 * KnobController.js
 *
 * @author realor
 */

import { PanelController } from "./PanelController.js";
import { Controller } from "./Controller.js";

class KnobController extends PanelController
{
  constructor(object, name)
  {
    super(object, name);

    this.input = 0;
    this.output = 0;
    this.minValue = 0;
    this.maxValue = 100;
    this.step = 5;
    this.knobClass = "knob";
    this.height = 200;
    this.controllerToExecute = ""; // name of controller to execute

    this._onRangeChange = this.onRangeChange.bind(this);
    this._input = null;
  }

  createPanel()
  {
    super.createPanel("left", 200);

    this.knobElem = document.createElement("div");
    this.knobElem.className = "knob";

    this.knobInnerElem = document.createElement("div");
    this.knobInnerElem.className = "knob-inner";
    this.knobElem.appendChild(this.knobInnerElem);

    this.ticksElem = document.createElement("div");
    this.ticksElem.className = "ticks";
    this.knobElem.appendChild(this.ticksElem);

    this.minElem = document.createElement("span");
    this.minElem.className = "min";
    this.knobElem.appendChild(this.minElem);

    this.maxElem = document.createElement("span");
    this.maxElem.className = "max";
    this.knobElem.appendChild(this.maxElem);

    this.rangeElem = document.createElement("input");
    this.rangeElem.type = "range";
    this.rangeElem.value = 0;
    this.rangeElem.className = "range";
    this.rangeElem.addEventListener("input", this._onRangeChange, false);
    this.rangeElem.setAttribute("aria-hidden", true);
    this.knobElem.appendChild(this.rangeElem);

    this.valueElem = document.createElement("div");
    this.valueElem.className = "current-value";
    this.knobElem.appendChild(this.valueElem);

    this.panel.bodyElem.appendChild(this.knobElem);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._pressed = false;

    this.knobElem.addEventListener("pointerdown", this._onPointerDown);
    this.panel.bodyElem.addEventListener("pointerup", this._onPointerUp);
    this.panel.bodyElem.addEventListener("pointerleave", this._onPointerUp);

    this.update();
  }

  onPointerDown(event)
  {
    this.panel.bodyElem.addEventListener("pointermove", this._onPointerMove);
    this._pressed = true;
  }

  onPointerUp(event)
  {
    this.panel.bodyElem.removeEventListener("pointermove", this._onPointerMove);
    this._pressed = false;
  }

  onPointerMove(event)
  {
    event.preventDefault();

    const boundingRectangle = this.knobInnerElem.getBoundingClientRect();

    let knobPositionX = boundingRectangle.left;
    let knobPositionY = boundingRectangle.top;

    let pointerX = event.clientX;
    let pointerY = event.clientY;

    let knobCenterX = boundingRectangle.width / 2 + knobPositionX;
    let knobCenterY = boundingRectangle.height / 2 + knobPositionY;

    let adjacentSide = knobCenterX - pointerX;
    let oppositeSide = knobCenterY - pointerY;

    let angleInRadians = Math.atan2(adjacentSide, oppositeSide);

    let angleInDegrees = 135 - Math.round(angleInRadians * 180 / Math.PI);

    if (angleInDegrees >= 0 && angleInDegrees <= 270)
    {
      this.updateKnob(null, angleInDegrees);
      this.executeController(this.controllerToExecute);
    }
  }

  onRangeChange(event)
  {
    this.updateKnob(this.rangeElem.value);
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
    if (!this._pressed)
    {
      this.panel.title = this.title || "";
      this.rangeElem.min = this.minValue;
      this.rangeElem.max = this.maxValue;
      this.rangeElem.step = this.step;
      this.rangeElem.value = this.output;

      this.minElem.textContent = this.minValue;
      this.maxElem.textContent = this.maxValue;

      let delta = this.maxValue - this.minValue;
      this._unitAngle = 270 / delta;

      this.createTicks();
    }

    if (this._input !== this.input)
    {
      this._input = this.input;
      if (!this._pressed) this.updateKnob(this.input);
    }
    else
    {
      if (!this._pressed) this.updateKnob(this.output);
    }
  }

  updateKnob(output, angleInDegrees)
  {
    if (typeof output === "number")
    {
      if (output < this.minValue) output = this.minValue;
      else if (output > this.maxValue) output = this.maxValue;

      angleInDegrees = this._unitAngle * (output - this.minValue);
    }
    else // angleInDegrees
    {
      output = Math.round(angleInDegrees / this._unitAngle) + this.minValue;
    }
    this.knobInnerElem.style.transform = "rotate(" + angleInDegrees + "deg)";
    this.highlightTicks(angleInDegrees);

    if (output !== this.output)
    {
      this.output = output;
      this.valueElem.textContent = output;
      this.rangeElem.value = output;
      this.application.notifyObjectsChanged(this.object, this);
    }
  }

  createTicks()
  {
    const ticksElem = this.ticksElem;
    const step = this.step;

    ticksElem.innerHTML = "";

    let tickAngle = -135;

    while (tickAngle <= 135)
    {
      let tickElem = document.createElement("div");
      tickElem.className = "tick";

      ticksElem.appendChild(tickElem);
      tickElem.style.transform = "rotate(" + tickAngle + "deg)";
      tickAngle += step * this._unitAngle;
    }
  }

  highlightTicks(angleInDegrees)
  {
    let tickAngle = 0; //reset

    let ticksElem = this.ticksElem.querySelectorAll("div");
    for (let tickElem of ticksElem)
    {
      if (tickAngle <= angleInDegrees && angleInDegrees > 0)
      {
        tickElem.classList.add("activetick");
      }
      else
      {
        tickElem.classList.remove("activetick");
      }
      tickAngle += this.step * this._unitAngle;
    }
  }
}

Controller.addClass(KnobController);

export { KnobController };