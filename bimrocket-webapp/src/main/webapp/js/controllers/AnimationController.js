/*
 * AnimationController.js
 *
 * @author realor
 */
import { Controller } from "./Controller.js";

class AnimationController extends Controller
{
  constructor(object, name)
  {
    super(object, name);

    this.input = 0;

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
    if (event.type === "nodeChanged" && this.hasChanged(event))
    {
      this.startAnimation();
    }
  }
};

export { AnimationController };
