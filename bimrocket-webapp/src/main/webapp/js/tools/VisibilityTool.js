/*
 * VisibilityTool.js
 *
 * @autor: realor
 */

BIMROCKET.VisibilityTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "visibility";
    this.label = "tool.visibility.label";
    this.help = "tool.visibility.help";
    this.className = "visibility";

    this.immediate = true;
    this.edgesVisible = true;
    this.facesVisible = true;
    this.recursive = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.updateVisibility(null, 
      this.edgesVisible, this.facesVisible, this.recursive);
  }
};
