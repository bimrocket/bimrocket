/*
 * CloudExplorerTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/file/FileExplorer.js";
import { SaveDialog } from "../ui/SaveDialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { Toast } from "../ui/Toast.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { OpenModelAction } from "../ui/file/OpenModelAction.js";
import { OpenFileAction } from "../ui/file/OpenFileAction.js";
import { SaveModelAction } from "../ui/file/SaveModelAction.js";
import { EditReportAction } from "../ui/file/EditReportAction.js";
import { RunReportAction } from "../ui/file/RunReportAction.js";
import { CreateReportAction } from "../ui/file/CreateReportAction.js";
import { EditScriptAction } from "../ui/file/EditScriptAction.js";
import { RunScriptAction } from "../ui/file/RunScriptAction.js";
import { CreateScriptAction } from "../ui/file/CreateScriptAction.js";
import { CreateModelValidationAction } from "../ui/file/CreateModelValidationAction.js";
import { EditModelValidationAction } from "../ui/file/EditModelValidationAction.js";
import { SaveModelValidationAction } from "../ui/file/SaveModelValidationAction.js";

class CloudExplorerTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "cloud_explorer";
    this.label = "tool.cloud_explorer.label";
    this.help = "tool.cloud_explorer.help";
    this.className = "cloud_explorer";
    this.setOptions(options);
    application.addTool(this);

    const fileExplorer = new FileExplorer(application);
    this.fileExplorer = fileExplorer;
    fileExplorer.title = this.label;
    fileExplorer.group = "model";

    application.panelManager.addPanel(fileExplorer);

    const contextMenu = fileExplorer.contextMenu;
    const action = fileExplorer.createContextAction;

    contextMenu.addMenuItem(action(OpenModelAction), "default");
    contextMenu.addMenuItem(action(RunScriptAction), "default");
    contextMenu.addMenuItem(action(RunReportAction), "default");
    contextMenu.addMenuItem(action(OpenFileAction), "default");

    contextMenu.addMenuItem(action(EditScriptAction), "edit");
    contextMenu.addMenuItem(action(EditModelValidationAction), "edit");
    contextMenu.addMenuItem(action(EditReportAction), "edit");

    const addMenu = contextMenu.getMenu("menu.file.create");
    addMenu.addMenuItem(action(CreateScriptAction, { label : "action.script" }));
    addMenu.addMenuItem(action(CreateReportAction, { label : "action.report" }));
    addMenu.addMenuItem(action(CreateModelValidationAction));

    contextMenu.addMenuItem(action(SaveModelAction), "save");
    contextMenu.addMenuItem(action(SaveModelValidationAction), "save");

    fileExplorer.onClose = () => this.application.useTool(null);
  }

  activate()
  {
    this.fileExplorer.visible = true;
    if (this.fileExplorer.service === null)
    {
      this.fileExplorer.goHome();
    }
  }

  deactivate()
  {
    this.fileExplorer.visible = false;
  }
}

export { CloudExplorerTool };
