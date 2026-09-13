/*
 * SetupTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { SetupPanel } from "../ui/SetupPanel.js";

class SetupTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "setup";
    this.label = "base|tool.setup.label";
    this.className = "setup";
    this.iconName = "base|setup";

    this.setOptions(options);
    application.addTool(this);

    this.panel = new SetupPanel(application);
    this.panel.tool = this;
    application.panelManager.addPanel(this.panel);
  }

  activate()
  {
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }
}

export { SetupTool };
