/*
 * GestureHandler.js
 *
 * @author realor
 */

import * as THREE from "three";

class GestureHandler
{
  constructor(tool)
  {
    this.tool = tool;
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this.pointers = new Map();
  }

  enable()
  {
    const container = this.tool.application.container;
    container.addEventListener("pointerdown", this._onPointerDown);
    container.addEventListener("pointerup", this._onPointerUp);
    container.addEventListener('contextmenu', this._onContextMenu, false);
  }

  disable()
  {
    const container = this.tool.application.container;
    container.removeEventListener("pointerdown", this._onPointerDown);
    container.removeEventListener("pointermove", this._onPointerMove);
    container.removeEventListener("pointerup", this._onPointerUp);
    container.removeEventListener('contextmenu', this._onContextMenu, false);

    this.pointers.clear();
  }

  onStartGesture()
  {
    if (this.tool.onStartGesture)
    {
      this.tool.onStartGesture();
    }
  }

  onEndGesture()
  {
    if (this.tool.onEndGesture)
    {
      this.tool.onEndGesture();
    }
  }

  onTap(position, button)
  {
    if (this.tool.onTap)
    {
      this.tool.onTap(position, button);
    }
  }

  onDrag(position, direction, pointerCount, button, pointerType)
  {
    if (this.tool.onDrag)
    {
      this.tool.onDrag(position, direction, pointerCount, button, pointerType);
    }
  }

  onZoom(position, delta)
  {
    if (this.tool.onZoom)
    {
      this.tool.onZoom(position, delta);
    }
  }

  onRotate(position, angle)
  {
    if (this.tool.onRotate)
    {
      this.tool.onRotate(position, angle);
    }
  }

  onPointerDown(event)
  {
    const application = this.tool.application;

    if (!application.isCanvasEvent(event)) return;

    const container = application.container;
    let pointers = this.pointers;
    if (pointers.size === 0)
    {
      container.addEventListener("pointermove", this._onPointerMove);
      this.onStartGesture();
    }

    let pointerId = event.pointerId;
    let pointerData = pointers.get(pointerId);
    if (pointerData === undefined)
    {
      pointerData =
      {
        id: pointerId,
        position : new THREE.Vector2(),
        previous : new THREE.Vector2(),
        delta : new THREE.Vector2(),
        pointerType : event.pointerType,
        button : event.button,
        dragLength : 0,
        tapEnabled : true
      };
      pointers.set(pointerId, pointerData);
      container.setPointerCapture(pointerId);
      if (pointers.size > 1)
      {
        for (let otherPointerData of pointers.values())
        {
          if (otherPointerData)
          {
            otherPointerData.tapEnabled = false;
          }
        }
      }
    }
    const pointerPosition = this.tool.application.getPointerPosition(event);
    pointerData.position.copy(pointerPosition);
    pointerData.previous.copy(pointerPosition);
    pointerData.delta.set(0, 0);
  }

  onPointerMove(event)
  {
    let pointers = this.pointers;
    let pointerId = event.pointerId;
    let pointerData = pointers.get(pointerId);
    if (pointerData)
    {
      const x = event.offsetX || event.layerX;
      const y = event.offsetY || event.layerY;
      pointerData.previous.copy(pointerData.position);
      pointerData.position.set(x, y);
      pointerData.delta.subVectors(pointerData.position, pointerData.previous);
    }

    if (pointers.size === 1)
    {
      const [pointerData] = pointers.values();
      pointerData.dragLength += pointerData.delta.length();
      this.onDrag(pointerData.previous, pointerData.delta, 1,
        pointerData.button, pointerData.pointerType);
    }
    else if (pointers.size === 2)
    {
      const [pointer1Data, pointer2Data] = pointers.values();

      const center = new THREE.Vector2();
      center.addVectors(pointer1Data.previous, pointer2Data.previous);
      center.x *= 0.5;
      center.y *= 0.5;

      let dot = pointer1Data.delta.dot(pointer2Data.delta);
      if (dot > 0)
      {
        let direction = new THREE.Vector2();
        direction.addVectors(pointer1Data.delta, pointer2Data.delta);
        direction.x *= 0.25;
        direction.y *= 0.25;
        this.onDrag(center, direction, 2,
          pointer1Data.button, pointer1Data.pointerType);
      }
      else
      {
        let distance1 = pointer1Data.previous.distanceTo(pointer2Data.previous);
        let distance2 = pointer1Data.position.distanceTo(pointer2Data.position);
        let delta = distance1 - distance2;
        this.onZoom(center, delta);
        // TODO: detect rotation
      }
    }
  }

  onPointerUp(event)
  {
    const container = this.tool.application.container;
    let pointers = this.pointers;
    let pointerId = event.pointerId;
    let pointerData = pointers.get(pointerId);
    if (pointerData)
    {
      if (pointerData.dragLength < 3 && pointerData.tapEnabled)
      {
        this.onTap(pointerData.position, pointerData.button);
      }
      pointers.delete(pointerId);
      container.releasePointerCapture(pointerId);
    }

    if (pointers.size === 0)
    {
      container.removeEventListener("pointermove", this._onPointerMove);
      this.onEndGesture();
    }
  }

  onContextMenu(event)
  {
    event.preventDefault();
  }
}

export { GestureHandler };
