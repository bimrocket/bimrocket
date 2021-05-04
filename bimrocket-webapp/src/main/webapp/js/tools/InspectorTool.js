/*
 * InspectorTool.js
 *
 * @autor: realor
 */

BIMROCKET.InspectorTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "inspector";
    this.label = "tool.inspector.label";
    this.help = "tool.inspector.help";
    this.className = "inspector";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    this.application.inspector.visible = true;
  }
};