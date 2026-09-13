/*
 * CopyTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class CopyTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "copy";
    this.label = "base|tool.copy.label";
    this.className = "copy";
    this.iconName = "copy";
    this.dynamic = false;

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  isEnabled()
  {
    return this.application.isCopyCutRemoveEnabled();
  }

  execute()
  {
    this.application.copyObjects();
  }
}

export { CopyTool };

