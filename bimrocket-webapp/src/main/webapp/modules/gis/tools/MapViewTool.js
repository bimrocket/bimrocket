/*
 * MapViewTool.js
 *
 * @author nexus
 */

import { Tool } from "platform/ui/Tool.js";
import { MapViewDialog } from "../ui/MapViewDialog.js";

class MapViewTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "map_view";
    this.label = "gis|tool.map_view.label";
    this.help = "gis|tool.map_view.help";
    this.className = "map-view";
    this.iconName = "gis|map-view";

    this.setOptions(options);
    application.addTool(this);

    const dialog = new MapViewDialog(application);
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

export { MapViewTool };
