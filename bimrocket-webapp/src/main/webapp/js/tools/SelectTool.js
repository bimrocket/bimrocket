/*
 * SelectTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";

class SelectTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select";
    this.label = "tool.select.label";
    this.help = "tool.select.help";
    this.className = "select";
    this.setOptions(options);

    this._onPointerDown = this.onPointerDown.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 120;

    const helpElem = document.createElement("div");
    this.panel.bodyElem.appendChild(helpElem);

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "center";
    this.posElem.style.padding = "4px";
    this.panel.bodyElem.appendChild(this.posElem);

    this.controllersElem = document.createElement("div");
    this.controllersElem.className = "controllers";
    this.panel.bodyElem.appendChild(this.controllersElem);

    I18N.set(helpElem, "innerHTML", this.help);
  }

  activate()
  {
    this.panel.visible = true;
    var container = this.application.container;
    container.addEventListener('pointerdown', this._onPointerDown, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    var container = this.application.container;
    container.removeEventListener('pointerdown', this._onPointerDown, false);
  }

  onPointerDown(event)
  {
    if (!this.isCanvasEvent(event)) return;

    const application = this.application;
    const scene = application.scene;
    const selection = application.selection;

    var pointerPosition = this.getEventPosition(event);
    var intersect = this.intersect(pointerPosition, scene, true);
    if (intersect)
    {
      var point = intersect.point;
      var xpos = Math.round(point.x * 1000) / 1000;
      var ypos = Math.round(point.y * 1000) / 1000;
      var zpos = Math.round(point.z * 1000) / 1000;
      this.posElem.innerHTML = "(x, y ,z) = (" +
        xpos + ", " + ypos + ", " + zpos + ")";

      var object = intersect.object;

      var parent = object;
      while (parent && !parent.userData.selection)
      {
        parent = parent.parent;
      }
      if (parent && parent.userData.selection.group)
      {
        object = parent;
      }
      application.selectObjects(event, [object]);
    }
    else
    {
      selection.clear();
    }
  }
}

export { SelectTool };
