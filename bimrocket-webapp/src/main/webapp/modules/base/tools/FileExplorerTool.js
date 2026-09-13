/*
 * CloudExplorerTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { SaveDialog } from "platform/ui/dialog/SaveDialog.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { OpenModelAction } from "../ui/file/OpenModelAction.js";
import { SaveModelAction } from "../ui/file/SaveModelAction.js";
import { OpenFileAction } from "../ui/file/OpenFileAction.js";
import { EditScriptAction } from "../ui/file/EditScriptAction.js";
import { RunScriptAction } from "../ui/file/RunScriptAction.js";
import { CreateScriptAction } from "../ui/file/CreateScriptAction.js";
import { EditTextFileAction } from "../ui/file/EditTextFileAction.js";

class FileExplorerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "file_explorer";
    this.label = "base|tool.file_explorer.label";
    this.help = "base|tool.file_explorer.help";
    this.className = "file-explorer";
    this.iconName = "file-explorer";

    this.setOptions(options);
    this.immediate = true;

    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    const application = this.application;
    const panelManager = application.panelManager;
    let fileExplorer = panelManager.getPanel("file_explorer");
    if (!fileExplorer)
    {
      fileExplorer = new FileExplorer(application);
      panelManager.addPanel(fileExplorer);
    }

    const contextMenu = fileExplorer.contextMenu;
    const action = fileExplorer.createContextAction;

    contextMenu.addMenuItem(action(OpenModelAction), "default");
    contextMenu.addMenuItem(action(OpenFileAction), "default");

    contextMenu.addMenuItem(action(EditTextFileAction), "edit");

    contextMenu.addMenuItem(action(SaveModelAction), "save");

    this.panel = fileExplorer;
  }

  execute()
  {
    const panel = this.panel;
    panel.visible = false;
    panel.title = this.label;
    panel.iconName = "file-explorer";
    panel.tool = this;
    panel.activateGroup("model");
    panel.visible = true;
  }
}

export { FileExplorerTool };
