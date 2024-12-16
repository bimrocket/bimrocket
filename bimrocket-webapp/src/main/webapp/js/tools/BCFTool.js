/*
 * BCFTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { BCFPanel } from "../ui/BCFPanel.js";
import { I18N } from "../i18n/I18N.js";

class BCFTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bcf";
    this.label = "bim|tool.bcf.label";
    this.help = "bim|tool.bcf.help";
    this.className = "bcf";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new BCFPanel(this.application);
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { BCFTool };