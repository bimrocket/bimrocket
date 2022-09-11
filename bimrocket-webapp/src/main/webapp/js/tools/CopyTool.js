/*
 * CopyTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class CopyTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "copy";
    this.label = "tool.copy.label";
    this.help = "tool.copy.help";
    this.className = "copy";
    this.immediate = true;
    this.dynamic = false;
    this.setOptions(options);
  }

  execute()
  {
    this.application.copyObjects();
  }
}

export { CopyTool };

