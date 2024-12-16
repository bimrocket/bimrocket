/*
 * PasteTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class PasteTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "paste";
    this.label = "tool.paste.label";
    this.help = "tool.paste.help";
    this.className = "paste";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    this.application.pasteObjects();
  }
}

export { PasteTool };
