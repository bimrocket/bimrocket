/*
 * ScaleTool.js
 *
 * @author: realor
 */
import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";

class ScaleTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "scale";
    this.label = "tool.scale.label";
    this.help = "tool.scale.help";
    this.className = "scale";
    this.setOptions(options);

    // internals
    this.objects = [];
    this.scaleStart = 0;
    this.scaleEnd = 0;

    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;
    I18N.set(this.panel.bodyElem, "innerHTML", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    const container = this.application.container;
    container.addEventListener('contextmenu', this._onContextMenu, false);
    container.addEventListener('mousedown', this._onMouseDown, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('mousedown', this._onMouseDown, false);
  }

  onMouseDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;

    event.preventDefault();
    const mousePosition = this.getMousePosition(event);

    this.objects = application.selection.roots;
    if (this.objects.length > 0)
    {
      this.scaleStart = mousePosition.x;
      const container = application.container;
      container.addEventListener('mousemove', this._onMouseMove, false);
      container.addEventListener('mouseup', this._onMouseUp, false);
    }
  }

  onMouseMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
    const mousePosition = this.getMousePosition(event);

    this.scaleEnd = mousePosition.x;
    let delta = this.scaleEnd - this.scaleStart;
    let factor = 1 + delta * 0.01;

    for (let i = 0; i < this.objects.length; i++)
    {
      let object = this.objects[i];

      object.scale.x *= factor;
      object.scale.y *= factor;
      object.scale.z *= factor;
      object.updateMatrix();
    }
    this.scaleStart = this.scaleEnd;

    const changeEvent = {type: "nodeChanged",
      objects: this.objects, source : this};
    this.application.notifyEventListeners("scene", changeEvent);
  }

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    this.object = null;

    var container = this.application.container;
    container.removeEventListener('mousemove', this._onMouseMove, false);
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onContextMenu(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { ScaleTool };
