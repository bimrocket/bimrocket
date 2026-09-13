/*
 * BSDDTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { BSDDPanel } from "../ui/BSDDPanel.js";

class BSDDTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bsdd";
    this.label = "bim|tool.bsdd.label";
    this.className = "bsdd";
    this.iconName = "bim|bsdd";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new BSDDPanel(this.application);
    this.panel.tool = this;
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { BSDDTool };