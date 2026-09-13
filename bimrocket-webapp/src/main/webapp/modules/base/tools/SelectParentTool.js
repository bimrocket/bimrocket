/*
 * SelectParentTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";

class SelectParentTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select_parent";
    this.label = "base|tool.select_parent.label";
    this.className = "select-parent";
    this.iconName = "base|select-parent";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const selection = this.application.selection;
    let objects = selection.objects;

    objects = objects.map(object => object.parent).filter(object => object);

    selection.set(...objects);
  }
}

export { SelectParentTool };