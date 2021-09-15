/*
 * InspectorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Inspector } from "../ui/Inspector.js";

class InspectorTool extends Tool
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

    this.panel = new Inspector(this.application);
    application.panelManager.addPanel(this.panel);
    this.panel.visible = true;
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { InspectorTool };