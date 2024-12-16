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
    this.dynamic = false;
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.copyObjects();
  }
}

export { CopyTool };

