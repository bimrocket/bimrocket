/*
 * StatisticsTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { StatisticsPanel } from "../ui/StatisticsPanel.js";

class StatisticsTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "statistics";
    this.label = "base|tool.statistics.label";
    this.help = "base|tool.statistics.help";
    this.className = "statistics";
    this.iconName = "base|statistics";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new StatisticsPanel(this.application);
    this.panel.tool = this;
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { StatisticsTool };