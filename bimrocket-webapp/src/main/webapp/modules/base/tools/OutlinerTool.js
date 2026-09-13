/*
 * OutlinerTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Outliner } from "platform/ui/outliner/Outliner.js";

class OutlinerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "outliner";
    this.label = "tool.outliner.label";
    this.help = "tool.outliner.help";
    this.className = "outliner";
    this.iconName = "outliner";

    this.setOptions(options);
    this.immediate = true;

    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;
    const panelManager = application.panelManager;
    let outliner = panelManager.getPanel("outliner");
    if (!outliner)
    {
      outliner = new Outliner(application);
      outliner.tool = this;
      panelManager.addPanel(outliner);
    }
    this.panel = outliner;
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { OutlinerTool };