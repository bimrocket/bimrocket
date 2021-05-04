/*
 * CutTool.js
 *
 * @autor: realor
 */

BIMROCKET.CutTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {    
    super(application);
    this.name = "cut";
    this.label = "tool.cut.label";
    this.help = "tool.cut.help";
    this.className = "cut";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.cutObjects();
  }
};
