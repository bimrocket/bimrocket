/*
 * BCFTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { BCFPanel } from "../ui/BCFPanel.js";
import { I18N } from "platform/i18n/I18N.js";

class BCFTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bcf";
    this.label = "bim|tool.bcf.label";
    this.help = "bim|tool.bcf.help";
    this.className = "bcf";
    this.iconName = "bim|bcf";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new BCFPanel(application);
    this.panel.tool = this;
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { BCFTool };