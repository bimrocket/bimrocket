/*
 * RotateTool.js
 *
 * @author: realor
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
    let mousePosition = this.getMousePosition(event);

    this.objects = application.selection.roots;
    if (this.objects.length > 0)
    {
      this.rotateStart = mousePosition.x;
      let container = application.container;
      container.addEventListener('mousemove', this._onMouseMove, false);
      container.addEventListener('mouseup', this._onMouseUp, false);
    }
  }

  onMouseMove(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
    var mousePosition = this.getMousePosition(event);

    this.rotateEnd = mousePosition.x;
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

  onMouseUp(event)
  {
    if (!this.isCanvasEvent(event)) return;

    this.objects = [];

    const container = this.application.container;
    container.removeEventListener('mousemove', this._onMouseMove, false);
    container.removeEventListener('mouseup', this._onMouseUp, false);
  }

  onContextMenu(event)
  {
    if (!this.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { RotateTool };