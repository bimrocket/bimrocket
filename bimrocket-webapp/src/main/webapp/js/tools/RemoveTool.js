/*
 * RemoveTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class RemoveTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "remove";
    this.label = "tool.remove.label";
    this.help = "tool.remove.help";
    this.className = "remove";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    let objects = application.selection.roots;
    for (let i = 0; i < objects.length; i++)
    {
      let object = objects[i];
      if (object.parent !== application.scene)
      {
        application.removeObject(object);
      }
    }
  }
}

export { RemoveTool };
