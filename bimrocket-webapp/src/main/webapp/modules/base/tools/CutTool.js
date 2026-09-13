/*
 * CutTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class CutTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "cut";
    this.label = "base|tool.cut.label";
    this.className = "cut";
    this.iconName = "cut";
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
    this.application.cutObjects();
  }
}

export { CutTool };
