/*
 * SelectionHandler.js
 *
 * @author realor
 */
class SelectionHandler
{
  constructor(tool)
  {
    this.tool = tool;
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);

    this._buttonPressed = -1;
    this._showContextMenu = false;
    this._pointerTimeoutId = null;
  }

  enable()
  {
    const container = this.tool.application.container;
    container.addEventListener("pointerdown", this._onPointerDown);
    container.addEventListener("pointerup", this._onPointerUp);
    container.addEventListener("contextmenu", this._onContextMenu);
  }

  disable()
  {
    const container = this.tool.application.container;
    container.removeEventListener("pointerdown", this._onPointerDown);
    container.removeEventListener("pointerup", this._onPointerUp);
    container.removeEventListener("contextmenu", this._onContextMenu);
  }

  onPointerDown(event)
  {
    const application = this.tool.application;
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

    const container = application.container;
    container.addEventListener("pointermove", this._onPointerMove);
  }

  onPointerUp(event)
  {
    const container = this.tool.application.container;
    container.removeEventListener("pointermove", this._onPointerMove);

    if (this._buttonPressed === -1) return;

    this.select(event, this._buttonPressed > 0);
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

    const application = this.tool.application;
    if (application.contextMenu.isVisible())
    {
      application.contextMenu.hide();
      this._buttonPressed = -1;
    }
  }

  onContextMenu(event)
  {
    const application = this.tool.application;
    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();
  }

  select(event, showContextMenu = false)
  {
    const tool = this.tool;
    const application = tool.application;

    if (!application.isCanvasEvent(event) || this._dragging) return;

    const position = application.getPointerPosition(event);
    let intersect = tool.intersect(position, application.baseObject);
    if (intersect)
    {
      let object = tool.findActualSelectedObject(intersect.object);
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
}

export { SelectionHandler };
