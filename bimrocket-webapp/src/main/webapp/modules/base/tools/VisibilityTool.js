/*
 * VisibilityTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class VisibilityTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "visibility";
    this.iconName = "base|show";

    this.visible = true;

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.updateVisibility(null, this.visible);
  }
}

export { VisibilityTool };
