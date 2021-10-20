/*
 * ScaleTool.js
 *
 * @author realor
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

    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
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
    container.addEventListener('pointerdown', this._onPointerDown, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('contextmenu', this._onContextMenu, false);
    container.removeEventListener('pointerdown', this._onPointerDown, false);
  }

  onPointerDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;

    event.preventDefault();
    const pointerPosition = this.getEventPosition(event);

    this.objects = application.selection.roots;
    if (this.objects.length > 0)
    {
      this.scaleStart = pointerPosition.x;
      const container = application.container;
      container.addEventListener('pointermove', this._onPointerMove, false);
      container.addEventListener('pointerup', this._onPointerUp, false);
    }
  }

  onPointerMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
    const pointerPosition = this.getEventPosition(event);

    this.scaleEnd = pointerPosition.x;
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

    this.application.notifyObjectsChanged(this.objects, this);
  }

  onPointerUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    this.object = null;

    var container = this.application.container;
    container.removeEventListener('pointermove', this._onPointerMove, false);
    container.removeEventListener('pointerup', this._onPointerUp, false);
  }

  onContextMenu(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { ScaleTool };
