/*
 * RotateTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";

class RotateTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "rotate";
    this.label = "tool.rotate.label";
    this.help = "tool.rotate.help";
    this.className = "rotate";
    this.setOptions(options);

    // internals
    this.objects = [];
    this.rotateStart = 0;
    this.rotateEnd = 0;

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
    let pointerPosition = this.getEventPosition(event);

    this.objects = application.selection.roots;
    if (this.objects.length > 0)
    {
      this.rotateStart = pointerPosition.x;
      let container = application.container;
      container.addEventListener('pointermove', this._onPointerMove, false);
      container.addEventListener('pointerup', this._onPointerUp, false);
    }
  }

  onPointerMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
    var pointerPosition = this.getEventPosition(event);

    this.rotateEnd = pointerPosition.x;
    let delta = this.rotateEnd - this.rotateStart;
    for (let i = 0; i < this.objects.length; i++)
    {
      let object = this.objects[i];
      object.rotation.z += (Math.PI / 180) * delta * 0.5;
      object.updateMatrix();
    }
    this.rotateStart = this.rotateEnd;

    const changeEvent = {type: "nodeChanged",
      objects: this.objects, source : this};
    this.application.notifyEventListeners("scene", changeEvent);
  }

  onPointerUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    this.objects = [];

    const container = this.application.container;
    container.removeEventListener('pointermove', this._onPointerMove, false);
    container.removeEventListener('pointerup', this._onPointerUp, false);
  }

  onContextMenu(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { RotateTool };