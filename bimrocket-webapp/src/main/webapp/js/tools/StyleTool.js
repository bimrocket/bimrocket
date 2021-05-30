/*
 * StyleTool.js
 *
 * @autor: realor
 */

BIMROCKET.StyleTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "style";
    this.label = "tool.style.label";
    this.help = "tool.style.help";
    this.className = "style";

    this.immediate = true;
    this.edgesVisible = true;
    this.facesVisible = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.updateStyle(null, this.edgesVisible, this.facesVisible);
  }
};
