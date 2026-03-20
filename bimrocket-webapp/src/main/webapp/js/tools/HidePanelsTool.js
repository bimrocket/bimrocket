/**
 * HidePanelsTool.js
 * 
 * @author alexis-i2cat
 */

import { Tool } from "./Tool.js";

class HidePanelsTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "hide_panels";
    this.label = "tool.hide_panels.label";
    this.className = "hide_panels";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const currentTool = this.application.tool;
    const viewTools = ["fly", "orbit", "select"];

    this.application.hidePanels();

    if (viewTools.includes(currentTool.name))
    {
      const activeTool = this.application.tools[currentTool.name];
      activeTool.panel.visible = true;
    }
  }
}

export { HidePanelsTool }