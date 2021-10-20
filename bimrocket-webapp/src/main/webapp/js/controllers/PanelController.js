/*
 * PanelController.js
 *
 * @author realor
 */

import { Controller } from "./Controller.js";

class PanelController extends Controller
{
  constructor(object, name)
  {
    super(object, name);
    this.title = "Title";

    this._onNodeChanged = this.onNodeChanged.bind(this);
    this._onSelection = this.onSelection.bind(this);
    this.panel = null;
  }

  init(application)
  {
    this.application = application;
    this.createPanel();
    if (this.autoStart) this.start();
  }

  onStart()
  {
    const application = this.application;
    application.addEventListener("scene", this._onNodeChanged);
    application.addEventListener("selection", this._onSelection);
    this.update();
  }

  onStop()
  {
    const application = this.application;
    application.removeEventListener("scene", this._onNodeChanged);
    application.removeEventListener("selection", this._onSelection);
    this.panel.visible = false;
  }

  createPanel(position = "left", height = 100)
  {
    this.panel = this.application.createPanel(this.name, position);
    this.panel.preferredHeight = height;
    this.panel.bodyElem.classList.add("center");
  }

  onNodeChanged(event)
  {
  }

  onSelection(event)
  {
    this.panel.visible = this.application.selection.contains(this.object);
    if (this.panel.visible)
    {
      this.update();
    }
  }

  update()
  {
    // updates panel content
  }
}

export { PanelController };
