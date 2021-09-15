/*
 * CloneTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class CloneTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "clone";
    this.label = "tool.clone.label";
    this.help = "tool.clone.help";
    this.className = "clone";
    this.immediate = true;
    this.dynamic = false;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.roots;
    for (let object of objects)
    {
      application.cloneObject(object, this.dynamic);
    }
  }
}

export { CloneTool };

