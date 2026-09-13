/*
 * BoxHandler.js
 *
 * @author realor
 */

import * as THREE from "three";

class BoxHandler
{
  constructor(tool)
  {
    this.tool = tool;
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);

    this.dragging = false;
    this.startPoint = new THREE.Vector2();
    this.box = new THREE.Box2();

    const application = tool.application;
    this.boxElem = document.createElement("div");
    const boxElem = this.boxElem;
    boxElem.style.position = "absolute";
    boxElem.style.display = "none";
    boxElem.style.width = "0";
    boxElem.style.height = "0";
    boxElem.style.left = "0";
    boxElem.style.top = "0";
    boxElem.style.border = "2px dotted red";
    boxElem.style.backgroundColor = "rgba(255, 255, 255, 0.25)";
    application.container.appendChild(boxElem);
  }

  enable()
  {
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  disable()
  {
    window.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
    this.stopDragging();
  }

  onBoxDrawn(box, event)
  {
    console.info(box);
  }

  onPointerDown(event)
  {
    const application = this.tool.application;

    if (!application.isCanvasEvent(event)) return;

    if (event.button !== 0) return;

    event.preventDefault();

    const boxElem = this.boxElem;

    this.startDragging();

    let startPoint = application.getPointerPosition(event);

    this.startPoint.copy(startPoint);

    boxElem.style.left = startPoint.x + "px";
    boxElem.style.top = startPoint.y + "px";
    boxElem.style.width = "0";
    boxElem.style.height = "0";
    boxElem.style.display = "";
  }

  onPointerMove(event)
  {
    const boxElem = this.boxElem;
    const application = this.tool.application;

    let endPoint = application.getPointerPosition(event);

    let box = this.getBox(this.startPoint, endPoint);
    let size = new THREE.Vector2();
    box.getSize(size);

    boxElem.style.left = box.min.x + "px";
    boxElem.style.top = box.min.y + "px";
    boxElem.style.width = size.x + "px";
    boxElem.style.height = size.y + "px";
  }

  onPointerUp(event)
  {
    if (!this.dragging) return;

    event.preventDefault();

    this.stopDragging();

    const application = this.tool.application;
    const boxElem = this.boxElem;

    let endPoint = application.getPointerPosition(event);

    let box = this.getBox(this.startPoint, endPoint);
    this.onBoxDrawn(box, event);
  }

  startDragging()
  {
    const container = this.tool.application.container;
    container.addEventListener("pointermove", this._onPointerMove, false);

    this.dragging = true;
  }

  stopDragging()
  {
    const container = this.tool.application.container;
    container.removeEventListener("pointermove", this._onPointerMove, false);

    this.dragging = false;

    const boxElem = this.boxElem;
    boxElem.style.display = "none";
    boxElem.style.left = "0";
    boxElem.style.top = "0";
    boxElem.style.width = "0";
    boxElem.style.height = "0";
  }

  getBox(startPoint, endPoint)
  {
    const box = this.box;
    box.makeEmpty();
    box.expandByPoint(startPoint);
    box.expandByPoint(endPoint);

    return box;
  }
}

export { BoxHandler };
