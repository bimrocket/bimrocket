/*
 * RemoveTool.js
 *
 * @autor: realor
 */

BIMROCKET.RemoveTool = class extends BIMROCKET.Tool
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
    let objects = application.selection.objects;
    for (let i = 0; i < objects.length; i++)
    {
      application.removeObject(objects[i]);
    }
  }
};
