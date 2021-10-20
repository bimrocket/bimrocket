/*
 * TranslationController.js
 *
 * @author realor
 */

import { AnimationController } from "./AnimationController.js";
import { Controller } from "./Controller.js";

class TranslationController extends AnimationController
{
  constructor(object, name)
  {
    super(object, name);

    let minPosition = object.position.x;
    let maxPosition = object.position.x + 1;

    this.axis = "x";
    this.minPosition = minPosition;
    this.maxPosition = maxPosition;
    this.minValue = 0;
    this.maxValue = 1;
    this.maxSpeed = 1;
  }

  animate(event)
  {
    let value = this.input;
    if (value === null) return;

    value = parseFloat(value);
    if (typeof value !== "number") return;

    let axis = this.axis || "x";
    let minValue = parseFloat(this.minValue);
    let maxValue = parseFloat(this.maxValue);
    let minPosition = parseFloat(this.minPosition);
    let maxPosition = parseFloat(this.maxPosition);
    let maxSpeed = parseFloat(this.maxSpeed);

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
      this.application.notifyObjectsChanged(this.object, this);
    }
  }
}

Controller.addClass(TranslationController);

export { TranslationController };
