/*
 * RemoveTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class RemoveTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "remove";
    this.label = "base|tool.remove.label";
    this.className = "remove";
    this.iconName = "trash";

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
