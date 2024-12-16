/*
 * BSDDTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { BSDDPanel } from "../ui/BSDDPanel.js";
import { I18N } from "../i18n/I18N.js";

class BSDDTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bsdd";
    this.label = "bim|tool.bsdd.label";
    this.className = "bsdd";
    this.immediate = true;
    this.setOptions(options);
    application.addTool(this);

    this.panel = new BSDDPanel(this.application);
    application.panelManager.addPanel(this.panel);
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { BSDDTool };