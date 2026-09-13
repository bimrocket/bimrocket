/*
 * PasteTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class PasteTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "paste";
    this.label = "base|tool.paste.label";
    this.className = "paste";
    this.iconName = "clipboard";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  isEnabled()
  {
    return this.application.isPasteEnabled();
  }

  execute()
  {
    this.application.pasteObjects();
  }
}

export { PasteTool };
