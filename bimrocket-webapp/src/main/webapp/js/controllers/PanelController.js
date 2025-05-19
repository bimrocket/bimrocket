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
    this.visibleOnSelectionCount = 1;
    this.height = 100;

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
    this.panel.preferredHeight = this.height;
    this.panel.minimumHeight = this.height;
    this.panel.visible = this.isPanelVisible();
    if (this.panel.visible)
    {
      this.update();
    }
  }

  onStop()
  {
    const application = this.application;
    application.removeEventListener("scene", this._onNodeChanged);
    application.removeEventListener("selection", this._onSelection);
    this.panel.visible = false;
  }

  createPanel(position = "left")
  {
    this.panel = this.application.createPanel(this.name, position);
    this.panel.preferredHeight = this.height;
    this.panel.minimumHeight = this.height;
    this.panel.bodyElem.classList.add("center");
  }

  onSelection(event)
  {
    this.panel.visible = this.isPanelVisible();
    if (this.panel.visible)
    {
      this.update();
    }
  }

  onNodeChanged(event)
  {
  }

  update()
  {
    // updates panel content
  }

  isPanelVisible()
  {
    const application = this.application;
    const selection = application.selection;

    return this.visibleOnSelectionCount === 0 || 
      (selection.contains(this.object) &&
       this.visibleOnSelectionCount >= selection.size);
  }
}

export { PanelController };
