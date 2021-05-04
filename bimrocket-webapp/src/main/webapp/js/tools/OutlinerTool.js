/*
 * OutlinerTool.js
 *
 * @autor: realor
 */

BIMROCKET.OutlinerTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "outliner";
    this.label = "tool.outliner.label";
    this.help = "tool.outliner.help";
    this.className = "outliner";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.outliner.visible = true;
  }
};