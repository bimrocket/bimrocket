/*
 * OutlinerTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Outliner } from "../ui/Outliner.js";

class OutlinerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "outliner";
    this.label = "tool.outliner.label";
    this.help = "tool.outliner.help";
    this.className = "outliner";
    this.immediate = true;
    this.setOptions(options);

    this.panel = new Outliner(this.application);
    application.panelManager.addPanel(this.panel);
    this.panel.visible = true;
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { OutlinerTool };