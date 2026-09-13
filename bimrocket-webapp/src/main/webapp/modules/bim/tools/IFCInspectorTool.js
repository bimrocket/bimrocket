/*
 * IFCInspectorTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { Controls } from "platform/ui/Controls.js";
import { Tree } from "platform/ui/tree/Tree.js";
import { Constant } from "platform/io/ifc/IFC.js";
import { IFCInspectorPanel } from "../ui/IFCInspectorPanel.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { I18N } from "platform/i18n/I18N.js";

class IFCInspectorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "ifc_inspector";
    this.label = "bim|tool.ifc_inspector.label";
    this.help = "bim|tool.ifc_inspector.help";
    this.className = "ifc-inspector";
    this.iconName = "bim|ifc-inspector";

    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.panel = new IFCInspectorPanel(this.application);
    this.panel.tool = this;
    application.panelManager.addPanel(this.panel);
    this.panel.visible = false;
  }

  execute()
  {
    this.panel.visible = true;
  }
}

export { IFCInspectorTool };

