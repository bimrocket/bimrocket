/*
 * SelectTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Application } from "../ui/Application.js";
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
    this.pointerSize = 8;
    this.touchPointerOffsetX = -40;
    this.touchPointerOffsetY = -40;
    this.setOptions(options);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);

    this.createPanel();

    this.pointerElem = document.createElement("div");
    const pointerElem = this.pointerElem;
    pointerElem.style.position = "absolute";
    pointerElem.style.display = "none";
    pointerElem.style.width = this.pointerSize + "px";
    pointerElem.style.height = this.pointerSize + "px";
    pointerElem.style.border = "1px solid black";
    pointerElem.style.borderRadius = this.pointerSize + "px";
    pointerElem.style.backgroundColor = "transparent";
    application.container.appendChild(pointerElem);
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left");
    this.panel.preferredHeight = 140;

    const helpElem = document.createElement("div");
    I18N.set(helpElem, "innerHTML", this.help);
    helpElem.style.marginBottom = "4px";
    this.panel.bodyElem.appendChild(helpElem);

    this.selectModeElem = Controls.addRadioButtons(this.panel.bodyElem,
      "selection_mode", "label.selection_mode",
      [[Application.SET_SELECTION_MODE, "label.set_selection_mode"],
       [Application.ADD_SELECTION_MODE, "label.add_selection_mode"],
       [Application.REMOVE_SELECTION_MODE, "label.remove_selection_mode"]],
      Application.SET_SELECTION_MODE, "selection_mode", () =>
      {
        this.application.selectionMode = this.selectModeElem.value;
      });

    this.posElem = document.createElement("div");
    this.posElem.style.textAlign = "center";
    this.posElem.style.padding = "4px";
    this.panel.bodyElem.appendChild(this.posElem);
  }

  activate()
  {
    this.panel.visible = true;
    const container = this.application.container;
    container.addEventListener('pointerdown', this._onPointerDown, false);
    container.addEventListener('pointerup', this._onPointerUp, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener('pointerdown', this._onPointerDown, false);
    container.removeEventListener('pointerup', this._onPointerUp, false);
    container.removeEventListener('pointermove', this._onPointerMove, false);
    this.pointerElem.style.display = "none";
  }

  onPointerDown(event)
  {
    const container = this.application.container;
    container.addEventListener('pointermove', this._onPointerMove, false);
  }

  onPointerUp(event)
  {
    const container = this.application.container;
    container.removeEventListener('pointermove', this._onPointerMove, false);

    const pointerElem = this.pointerElem;
    pointerElem.style.display = "none";

    if (!this.isPointSelectionEvent(event)) return;

    const application = this.application;
    const scene = application.scene;
    const selection = application.selection;

    let pointerPosition = this.getPointerPosition(event);
    let intersect = this.intersect(pointerPosition, scene, true);
    if (intersect)
    {
      let point = intersect.point;
      let xpos = Math.round(point.x * 1000) / 1000;
      let ypos = Math.round(point.y * 1000) / 1000;
      let zpos = Math.round(point.z * 1000) / 1000;
      this.posElem.innerHTML = "(x, y ,z) = (" +
        xpos + ", " + ypos + ", " + zpos + ")";

      let object = intersect.object;

      let parent = object;
      while (parent && !parent.userData.selection)
      {
        parent = parent.parent;
      }
      if (parent && parent.userData.selection.group)
      {
        object = parent;
      }
      application.userSelectObjects([object], event);
    }
    else
    {
      selection.clear();
    }
  }

  onPointerMove(event)
  {
    const pointerElem = this.pointerElem;

    if (!this.isPointSelectionEvent(event))
    {
      pointerElem.style.display = "none";
      return;
    }

    let pointerPosition = this.getPointerPosition(event);

    pointerElem.style.left =
      (pointerPosition.x - this.pointerSize / 2) + "px";
    pointerElem.style.top =
      (pointerPosition.y - this.pointerSize / 2) + "px";
    pointerElem.style.display = "";
  }

  getPointerPosition(event)
  {
    const container = this.application.container;
    let rect = container.getBoundingClientRect();
    const pointerPosition = new THREE.Vector2();
    pointerPosition.x = event.clientX - rect.left;
    pointerPosition.y = event.clientY - rect.top;

    if (event.pointerType === "touch")
    {
      pointerPosition.x += this.touchPointerOffsetX;
      pointerPosition.y += this.touchPointerOffsetY;
    }

    return pointerPosition;
  }

  isPointSelectionEvent(event)
  {
    if (this.application.menuBar.armed) return false;

    const target = event.target;
    const pointerElem = this.pointerElem;

    return target.nodeName.toLowerCase() === "canvas" || target === pointerElem;
  }
}

export { SelectTool };
