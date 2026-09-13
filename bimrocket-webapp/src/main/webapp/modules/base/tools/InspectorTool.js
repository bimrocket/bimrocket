/*
 * InspectorTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Inspector } from "platform/ui/inspector/Inspector.js";

class InspectorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "inspector";
    this.label = "tool.inspector.label";
    this.help = "tool.inspector.help";
    this.className = "inspector";
    this.iconName = "inspector";

    this.setOptions(options);
    this.immediate = true;

    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;
    const panelManager = application.panelManager;
    let inspector = panelManager.getPanel("inspector");
    if (!inspector)
    {
      inspector = new Inspector(application);
      inspector.tool = this;
      panelManager.addPanel(inspector);
    }
    this.panel = inspector;
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { InspectorTool };