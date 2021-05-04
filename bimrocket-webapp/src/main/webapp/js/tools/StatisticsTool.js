/*
 * StatisticsTool.js
 *
 * @autor: realor
 */

BIMROCKET.StatisticsTool = class extends BIMROCKET.Tool
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
  }

  execute()
  {
    this.application.statistics.visible = true;
  }
};