/*
 * RotationController.js
 *
 * @author realor
 */

import { AnimationController } from "./AnimationController.js";
import { ControllerManager } from "./ControllerManager.js";

class RotationController extends AnimationController
{
  static type = "RotationController";
  static description = "Rotates an object.";

  constructor(application, object, name)
  {
    super(application, object, name);

    let minAngle = object.rotation.z * 180 / Math.PI;
    let maxAngle = minAngle + 90;

    this.axis = this.createProperty("string", "Axis (x, y or z)", "z");
    this.minAngle = this.createProperty("number", "Min. angle (degrees)",
      minAngle);
    this.maxAngle = this.createProperty("number", "Max. angle (degrees)",
      maxAngle);
    this.minValue = this.createProperty("number", "Min. value", 0);
    this.maxValue = this.createProperty("number", "Max. value", 1);
    this.maxSpeed = this.createProperty("number", "Max. speed (degrees/s)", 30);
  }

  animate(event)
  {
    let value = this.input.value;
    if (value === null) return;

    value = parseFloat(value);
    if (typeof value !== "number") return;

    let axis = this.axis.value || "z";
    let minValue = parseFloat(this.minValue.value);
    let maxValue = parseFloat(this.maxValue.value);
    let minAngle = parseFloat(this.minAngle.value) * Math.PI / 180;
    let maxAngle = parseFloat(this.maxAngle.value) * Math.PI / 180;
    let maxSpeed = parseFloat(this.maxSpeed.value) * Math.PI / 180;

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
      this.application.notifyObjectsChanged(this.object);
    }
  }
}

ControllerManager.addClass(RotationController);

export { RotationController };
