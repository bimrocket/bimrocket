/*
 * StyleTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class StyleTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "style";
    this.className = "style";
    this.iconName = "base|style";
    
    this.edgesVisible = true;
    this.facesVisible = true;

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.updateStyle(null, this.edgesVisible, this.facesVisible);
  }
}

export { StyleTool };
