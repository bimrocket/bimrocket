/*
 * StyleTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class StyleTool extends Tool
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
}

export { StyleTool };
