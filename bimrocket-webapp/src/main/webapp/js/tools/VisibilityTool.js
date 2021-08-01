/*
 * VisibilityTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";

class VisibilityTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "visibility";
    this.label = "tool.visibility.label";
    this.help = "tool.visibility.help";
    this.className = "visibility";

    this.immediate = true;
    this.visible = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.updateVisibility(null, this.visible);
  }
}

export { VisibilityTool };
