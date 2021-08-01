/*
 * StatisticsTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Statistics } from "../ui/Statistics.js";

class StatisticsTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "statistics";
    this.label = "tool.statistics.label";
    this.help = "tool.statistics.help";
    this.className = "statistics";
    this.immediate = true;
    this.setOptions(options);

    this.panel = new Statistics(this.application);
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { StatisticsTool };