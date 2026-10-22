/*
 * SelectionHighlighter.js
 *
 * @author realor
 */

class SelectionHighlighter
{
  constructor(application, options)
  {
    this.application = application;
    this.options = {...options};

    this._selectionColor = null;
  }

  getName()
  {
    return this.constructor.name;
  }

  update()
  {
  }

  set selectionColor(color)
  {
    this._selectionColor = color;
  }

  get selectionColor()
  {
    return this._selectionColor;
  }
}

export { SelectionHighlighter };
