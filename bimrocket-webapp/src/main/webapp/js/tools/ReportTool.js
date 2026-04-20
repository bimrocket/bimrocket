/*
 * ReportTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { FileExplorer } from "../ui/file/FileExplorer.js";
import { RunReportAction } from "../ui/file/RunReportAction.js";
import { EditReportAction } from "../ui/file/EditReportAction.js";
import { CreateReportAction } from "../ui/file/CreateReportAction.js";
import { RunScriptAction } from "../ui/file/RunScriptAction.js";
import { EditScriptAction } from "../ui/file/EditScriptAction.js";
import { CreateScriptAction } from "../ui/file/CreateScriptAction.js";
import { CreateIDSAction } from "../ui/file/CreateIDSAction.js";
import { EditIDSAction } from "../ui/file/EditIDSAction.js";
import { SaveIDSAction } from "../ui/file/SaveIDSAction.js";

class ReportTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "report";
    this.label = "tool.report.label";
    this.className = "report";
    this.setOptions(options);
    application.addTool(this);

    const fileExplorer = new FileExplorer(application);
    this.fileExplorer = fileExplorer;
    fileExplorer.showFileSize = false;
    fileExplorer.title = this.label;
    fileExplorer.group = "report";
    fileExplorer.onClose = () => this.application.useTool(null);

    application.panelManager.addPanel(fileExplorer);

    const contextMenu = fileExplorer.contextMenu;
    const action = fileExplorer.createContextAction;

    contextMenu.addMenuItem(action(RunReportAction), "default");
    contextMenu.addMenuItem(action(EditReportAction), "edit");
    contextMenu.addMenuItem(action(CreateReportAction), "create");

    contextMenu.addMenuItem(action(RunScriptAction), "default");
    contextMenu.addMenuItem(action(EditScriptAction), "edit");
    contextMenu.addMenuItem(action(CreateScriptAction), "create");

    contextMenu.addMenuItem(action(EditIDSAction), "edit");
    contextMenu.addMenuItem(action(CreateIDSAction), "create");
    contextMenu.addMenuItem(action(SaveIDSAction), "save");
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

export { ReportTool };
