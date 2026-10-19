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
    this._pointerDownTime = 0;
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
    this._pointerDownTime = Date.now();

    const container = application.container;
    container.addEventListener("pointermove", this._onPointerMove);
  }

  onPointerUp(event)
  {
    if (this._buttonPressed === -1) return;

    const tool = this.tool;
    const application = tool.application;
    const container = application.container;
    const selection = application.selection;

    container.removeEventListener("pointermove", this._onPointerMove);

    if (!application.isCanvasEvent(event) || this._dragging) return;

    const ellapsed = Date.now() - this._pointerDownTime;
    let showContextMenu = event.button > 0 || ellapsed > 500;

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
    this._buttonPressed = -1;

    if (showContextMenu) application.contextMenu.show(event);
  }

  onPointerMove(event)
  {
    this._dragging = true;
  }

  onContextMenu(event)
  {
    const application = this.tool.application;
    if (!application.isCanvasEvent(event)) return;

    event.preventDefault();
  }
}

export { SelectionHandler };
