/*
 * BCFTool.js
 *
 * @autor: realor
 */

BIMROCKET.BCFTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bcf";
    this.label = "tool.bcf.label";
    this.help = "tool.bcf.help";
    this.className = "bcf";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.bcfPanel.visible = true;
  }
};