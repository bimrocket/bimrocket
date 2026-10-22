/*
 * SelectTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Controls } from "platform/ui/Controls.js";
import { Application } from "platform/ui/Application.js";
import { I18N } from "platform/i18n/I18N.js";
import * as THREE from "three";

class SelectTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select";
    this.label = "base|tool.select.label";
    this.help = "base|tool.select.help";
    this.className = "select";
    this.iconName = "base|select";
    this.pointerSize = 8;
    this.touchPointerOffsetX = -40;
    this.touchPointerOffsetY = -40;

    this.setOptions(options);
    application.addTool(this);

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerLeave = this.onPointerLeave.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this._buttonPressed = -1;
    this._dragging = false;
    this._pointerTimeoutId = null;

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
    this.panel = this.application.createToolPanel(this)
      .setDefaultHeight(150)
      .setDefaultMobileHeight(150)
      .setMinimumHeight(80);

    const helpElem = document.createElement("div");
    I18N.set(helpElem, "textContent", this.help);
    helpElem.style.margin = "4px 0 4px 0";
    this.panel.bodyElem.appendChild(helpElem);

    this.selectModeElem = Controls.addRadioButtons(this.panel.bodyElem,
      "selection_mode", "base|label.selection_mode",
      [[Application.SET_SELECTION_MODE, "base|label.set_selection_mode"],
       [Application.ADD_SELECTION_MODE, "base|label.add_selection_mode"],
       [Application.REMOVE_SELECTION_MODE, "base|label.remove_selection_mode"]],
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
    this.panel.activated = true;
    const container = this.application.container;
    container.addEventListener("pointerdown", this._onPointerDown);
    container.addEventListener("pointerup", this._onPointerUp);
    container.addEventListener("pointerleave", this._onPointerLeave);
    container.addEventListener("contextmenu", this._onContextMenu);
    this.selectModeElem.setValue(this.application.selectionMode);
  }

  deactivate()
  {
    this.panel.activated = false;
    const container = this.application.container;
    container.removeEventListener("pointerdown", this._onPointerDown);
    container.removeEventListener("pointerup", this._onPointerUp);
    container.removeEventListener("pointerleave", this._onPointerLeave);
    container.removeEventListener("contextmenu", this._onContextMenu);

    this.disableDragging();
  }

  onPointerDown(event)
  {
    const application = this.application;
    if (!application.isCanvasEvent(event)) return;

    if (application.contextMenu.isVisible())
    {
      application.contextMenu.hide();
      this._buttonPressed = -1;
      return;
    }

    this._buttonPressed = event.button;
    this._dragging = false;

    this.clearPointerTimeout();
    this._pointerTimeoutId = setTimeout(() => this.onLongPress(event), 500);

    this.enableDragging();
  }

  onPointerUp(event)
  {
    this.disableDragging();

    if (this._buttonPressed === -1) return;

    this.select(event, !this._dragging && this._buttonPressed > 0);
    this.clearPointerTimeout();
    this._buttonPressed = -1;
  }

  onLongPress(event)
  {
    this.select(event, true);
    this.clearPointerTimeout();
    this._buttonPressed = -1;
  }

  onPointerMove(event)
  {
    this._dragging = true;

    this.clearPointerTimeout();

    const application = this.application;
    if (application.contextMenu.isVisible())
    {
      application.contextMenu.hide();
      this._buttonPressed = -1;
      return;
    }

    if (this._buttonPressed > 0) return;

    const pointerElem = this.pointerElem;

    if (!application.isCanvasEvent(event))
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

  onPointerLeave(event)
  {
    this.disableDragging();
  }

  onContextMenu(event)
  {
    const application = this.application;
    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();
  }

  enableDragging()
  {
    const container = this.application.container;
    container.addEventListener("pointermove", this._onPointerMove);
  }

  disableDragging()
  {
    const container = this.application.container;
    container.removeEventListener("pointermove", this._onPointerMove);

    const pointerElem = this.pointerElem;
    pointerElem.style.display = "none";
  }

  select(event, showContextMenu = false)
  {
    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    let position = this.getPointerPosition(event);
    let intersect = this.intersect(position, application.baseObject);
    if (intersect)
    {
      const point = intersect.point;
      const selPoint = new THREE.Vector3();
      const decimals = 3;

      selPoint.setFromMatrixPosition(application.baseObject.matrix);
      selPoint.negate().add(point);

      this.posElem.textContent = "(x, y, z) = (" +
        selPoint.x.toFixed(decimals) + ", " +
        selPoint.y.toFixed(decimals) + ", " +
        selPoint.z.toFixed(decimals) + ")";

      let object = this.findActualSelectedObject(intersect.object);
      application.userSelectObjects([object], event);
    }
    else if (!showContextMenu)
    {
      application.userSelectObjects([], event);
    }

    if (showContextMenu) application.contextMenu.show(event);
  }

  clearPointerTimeout()
  {
    if (this._pointerTimeoutId !== null)
    {
      clearTimeout(this._pointerTimeoutId);
      this._pointerTimeoutId = null;
    }
  }

  getPointerPosition(event)
  {
    const pointerPosition = this.application.getPointerPosition(event);

    if (event.pointerType === "touch" && this._dragging)
    {
      pointerPosition.x += this.touchPointerOffsetX;
      pointerPosition.y += this.touchPointerOffsetY;
    }
    return pointerPosition;
  }
}

export { SelectTool };
