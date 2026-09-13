/*
 * RebuildTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class RebuildTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "rebuild";
    this.label = "design|tool.rebuild.label";
    this.className = "rebuild";
    this.iconName = "design|rebuild";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.evaluateFormulas();
    this.application.rebuild();
  }
}

export { RebuildTool };