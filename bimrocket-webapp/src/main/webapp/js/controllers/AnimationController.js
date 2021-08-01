/*
 * AnimationController.js
 *
 * @author: realor
 */
import { ControllerManager } from "./ControllerManager.js";
import { Controller } from "./Controller.js";

class AnimationController extends Controller
{
  static type = "AnimationController";
  static description = "Animates an object.";

  constructor(application, object, name)
  {
    super(application, object, name);

    this.input = this.createProperty("number", "Input value", 0);

    this._animating = false;
    this._animate = this.animate.bind(this);
    this._onNodeChanged = this.onNodeChanged.bind(this);
  }

  onStart()
  {
    const application = this.application;
    application.addEventListener("scene", this._onNodeChanged);
    this.startAnimation();
  }

  onStop()
  {
    const application = this.application;
    application.removeEventListener("scene", this._onNodeChanged);
    this.stopAnimation();
  }

  startAnimation()
  {
    if (!this._animating)
    {
      this._animating = true;
      this.application.addEventListener("animation", this._animate);
    }
  }

  stopAnimation()
  {
    if (this._animating)
    {
      this._animating = false;
      this.application.removeEventListener("animation", this._animate);
    }
  }

  animate(event)
  {
  }

  onNodeChanged(event)
  {
    if (event.type === "nodeChanged" && this.input.isBoundTo(event.objects))
    {
      this.startAnimation();
    }
  }
};

export { AnimationController };
