/*
 * BIMInspectorTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Tree } from "../ui/Tree.js";
import { Constant } from "../io/ifc/IFC.js";
import { BIMInspectorPanel } from "../ui/BIMInspectorPanel.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";

class BIMInspectorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_inspector";
    this.label = "bim|tool.bim_inspector.label";
    this.help = "bim|tool.bim_inspector.help";
    this.className = "bim_inspector";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new BIMInspectorPanel(this.application);
    application.panelManager.addPanel(this.panel);
    this.panel.visible = false;
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { BIMInspectorTool };

