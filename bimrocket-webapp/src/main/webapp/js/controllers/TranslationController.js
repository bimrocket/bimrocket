/*
 * TranslationController.js
 *
 * @author realor
 */

import { AnimationController } from "./AnimationController.js";
import { ControllerManager } from "./ControllerManager.js";

class TranslationController extends AnimationController
{
  static type = "TranslationController";
  static description = "Translates an object.";

  constructor(application, object, name)
  {
    super(application, object, name);

    let minPosition = object.position.x;
    let maxPosition = object.position.x + 1;

    this.axis = this.createProperty("string", "Axis (x, y or z)", "x");
    this.minPosition = this.createProperty("number", "Min. position",
      minPosition);
    this.maxPosition = this.createProperty("number", "Max. position",
      maxPosition);
    this.minValue = this.createProperty("number", "Min. value", 0);
    this.maxValue = this.createProperty("number", "Max. value", 1);
    this.maxSpeed = this.createProperty("number", "Max. speed (u/s)", 1);
  }

  animate(event)
  {
    let value = this.input.value;
    if (value === null) return;

    value = parseFloat(value);
    if (typeof value !== "number") return;

    let axis = this.axis.value || "x";
    let minValue = parseFloat(this.minValue.value);
    let maxValue = parseFloat(this.maxValue.value);
    let minPosition = parseFloat(this.minPosition.value);
    let maxPosition = parseFloat(this.maxPosition.value);
    let maxSpeed = parseFloat(this.maxSpeed.value);

    let factor = (value - minValue) / (maxValue - minValue); // [0..1]
    let targetPosition = minPosition + factor * (maxPosition - minPosition);
    let position = this.object.position[axis];
    let delta = targetPosition - position;
    if (Math.abs(delta) < 0.001)
    {
      this.stopAnimation();
    }
    else
    {
      let speed = (delta / 0.2);
      if (speed > maxSpeed) speed = maxSpeed;
      else if (speed < -maxSpeed) speed = -maxSpeed;
      this.object.position[axis] += speed * event.delta;
      this.object.updateMatrix();
      this.application.notifyObjectUpdated(this.object);
    }
  }
}

ControllerManager.addClass(TranslationController);

export { TranslationController };
