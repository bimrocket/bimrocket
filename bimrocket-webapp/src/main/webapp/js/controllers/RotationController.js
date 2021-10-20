/*
 * RotationController.js
 *
 * @author realor
 */

import { AnimationController } from "./AnimationController.js";
import { Controller } from "./Controller.js";

class RotationController extends AnimationController
{
  constructor(object, name)
  {
    super(object, name);

    let minAngle = object.rotation.z * 180 / Math.PI;
    let maxAngle = minAngle + 90;

    this.axis = "z";
    this.minAngle = minAngle; // degrees
    this.maxAngle = maxAngle; // degrees
    this.minValue = 0;
    this.maxValue = 1;
    this.maxSpeed = 90; // degrees / second
  }

  animate(event)
  {
    let value = this.input;
    if (value === null) return;

    value = parseFloat(value);
    if (typeof value !== "number") return;

    let axis = this.axis|| "z";
    let minValue = parseFloat(this.minValue);
    let maxValue = parseFloat(this.maxValue);
    let minAngle = parseFloat(this.minAngle) * Math.PI / 180;
    let maxAngle = parseFloat(this.maxAngle) * Math.PI / 180;
    let maxSpeed = parseFloat(this.maxSpeed) * Math.PI / 180;

    let factor = (value - minValue) / (maxValue - minValue); // [0..1]
    let targetAngle = minAngle + factor * (maxAngle - minAngle);
    let angle = this.object.rotation[axis];
    let delta = targetAngle - angle;

    if (Math.abs(delta) < 0.001)
    {
      this.stopAnimation();
    }
    else
    {
      let speed = (delta / 0.2);
      if (speed > maxSpeed) speed = maxSpeed;
      else if (speed < -maxSpeed) speed = -maxSpeed;
      this.object.rotation[axis] += speed * event.delta;
      this.object.updateMatrix();
      this.application.notifyObjectsChanged(this.object, this);
    }
  }
}

Controller.addClass(RotationController);

export { RotationController };
