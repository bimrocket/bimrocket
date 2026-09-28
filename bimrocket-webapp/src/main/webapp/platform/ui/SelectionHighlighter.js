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
  }

  getName()
  {
    return this.constructor.name;
  }

  update()
  {
  }
}

export { SelectionHighlighter };
