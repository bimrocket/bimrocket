/*
 * IDSEditorTool.js
 *
 * Tool to open the IDS (Information Delivery Specification) visual editor.
 *
 * @author UPC
 */

import { Tool } from "./Tool.js";
import { IDSEditorDialog } from "../ui/IDSEditorDialog.js";

class IDSEditorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "ids_editor";
    this.label = "bim|tool.ids_editor.label";
    this.help  = "bim|tool.ids_editor.help";
    this.className = "ids_editor";
    this.setOptions(options);
    application.addTool(this);
    this.immediate = true;

    this.dialog = new IDSEditorDialog(application);
    application.panelManager.addPanel(this.dialog);
  }

  execute()
  {
    this.dialog.visible = !this.dialog.visible;
  }
}

export { IDSEditorTool };
