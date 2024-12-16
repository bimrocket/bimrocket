/*
 * IFCDBTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { IFCDBPanel } from "../ui/IFCDBPanel.js";

class IFCDBTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "ifcdb";
    this.label = "bim|tool.ifcdb.label";
    this.help = "bim|tool.ifcdb.help";
    this.className = "ifcdb";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new IFCDBPanel(this.application);
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { IFCDBTool };