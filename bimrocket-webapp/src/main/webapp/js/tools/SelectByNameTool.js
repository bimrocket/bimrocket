/*
 * SelectByNameTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";

class SelectByNameTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select_by_name";
    this.label = "tool.select_by_name.label";
    this.className = "select_by_name";
    this.propertyName = "Representation";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;
  }

  execute()
  {
    const selection = this.application.selection;
    let objects = selection.objects;

    objects = objects.map(object => this.getNamedChild(object))
      .filter(object => object);

    selection.set(...objects);
  }

  getNamedChild(object)
  {
    const children = object.children;
    for (let i = 0; i < children.length; i++)
    {
      let child = children[i];
      if (child.name === this.propertyName) return child;
    }
    return null;
  }
}

export { SelectByNameTool };