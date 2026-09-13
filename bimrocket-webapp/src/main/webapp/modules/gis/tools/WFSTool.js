/*
 * WFSTool.js
 *
 * @author nexus
 */

import { Tool } from "platform/ui/Tool.js";
import { WFSDialog } from "../ui/WFSDialog.js";

class WFSTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "wfs";
    this.label = "gis|tool.wfs.label";
    this.help = "gis|tool.wfs.help";
    this.className = "wfs";
    this.iconName = "gis|wfs";

    this.setOptions(options);
    application.addTool(this);

    const dialog = new WFSDialog(application);
    this.dialog = dialog;

    dialog.onHide = () => this.application.useTool(null);

  }

  activate()
  {
    this.dialog.visible = true;
  }

  deactivate()
  {
    this.dialog.visible = false;
  }
}

export { WFSTool };
