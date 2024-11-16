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
    this._onPointerLeave = this.onPointerLeave.bind(this);

    this.dragging = false;

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

    this.panel.onHide = () => this.application.useTool(null);

    const helpElem = document.createElement("div");
    I18N.set(helpElem, "textContent", this.help);
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
    container.addEventListener("pointerdown", this._onPointerDown, false);
    container.addEventListener("pointerup", this._onPointerUp, false);
    container.addEventListener("pointerleave", this._onPointerLeave, false);
  }

  deactivate()
  {
    this.panel.visible = false;
    const container = this.application.container;
    container.removeEventListener("pointerdown", this._onPointerDown, false);
    container.removeEventListener("pointerup", this._onPointerUp, false);
    container.removeEventListener("pointerleave", this._onPointerLeave, false);

    this.stopDragging();
  }

  onPointerDown(event)
  {
    const application = this.application;
    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();

    this.startDragging();
  }

  onPointerUp(event)
  {
    if (!this.dragging) return;

    event.preventDefault();

    this.stopDragging();

    const application = this.application;

    if (!application.isCanvasEvent(event)) return;

    const scene = application.scene;
    const selection = application.selection;

    let pointerPosition = this.getPointerPosition(event);
    let intersect = this.intersect(pointerPosition, scene);
    if (intersect)
    {
      const point = intersect.point;
      const selPoint = new THREE.Vector3();
      const decimals = 3;

      selPoint.setFromMatrixPosition(application.baseObject.matrix);
      selPoint.negate().add(point);

      this.posElem.textContent = "(x, y ,z) = (" +
        selPoint.x.toFixed(decimals) + ", " +
        selPoint.y.toFixed(decimals) + ", " +
        selPoint.z.toFixed(decimals) + ")";

      let object = this.findActualSelectedObject(intersect.object);

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

    const application = this.application;

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
    if (this.dragging)
    {
      this.stopDragging();
    }
  }

  startDragging()
  {
    const container = this.application.container;
    container.addEventListener("pointermove", this._onPointerMove, false);

    this.dragging = true;
  }

  stopDragging()
  {
    const container = this.application.container;
    container.removeEventListener("pointermove", this._onPointerMove, false);

    const pointerElem = this.pointerElem;
    pointerElem.style.display = "none";

    this.dragging = false;
  }

  getPointerPosition(event)
  {
    const pointerPosition = this.application.getPointerPosition(event);

    if (event.pointerType === "touch")
    {
      pointerPosition.x += this.touchPointerOffsetX;
      pointerPosition.y += this.touchPointerOffsetY;
    }
    return pointerPosition;
  }
}

export { SelectTool };
