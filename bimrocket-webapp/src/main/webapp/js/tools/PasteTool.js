/*
 * PasteTool.js
 *
 * @autor: realor
 */

BIMROCKET.PasteTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "paste";
    this.label = "tool.paste.label";
    this.help = "tool.paste.help";
    this.className = "paste";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.pasteObjects();
  }
};
