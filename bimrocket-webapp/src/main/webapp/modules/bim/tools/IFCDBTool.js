/*
 * IFCDBTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
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
    this.iconName = "bim|ifcdb";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new IFCDBPanel(this.application);
    this.panel.tool = this;
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { IFCDBTool };