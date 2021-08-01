/*
 * CutTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";

class CutTool extends Tool
{
  constructor(application, options)
  {    
    super(application);
    this.name = "cut";
    this.label = "tool.cut.label";
    this.help = "tool.cut.help";
    this.className = "cut";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.cutObjects();
  }
}

export { CutTool };
