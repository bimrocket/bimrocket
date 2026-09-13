/*
 * ReportTool.js
 *
 * @author realor
 */

import { Tool } from "platform/ui/Tool.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { RunReportAction } from "../ui/file/RunReportAction.js";
import { EditReportAction } from "../ui/file/EditReportAction.js";
import { CreateReportAction } from "../ui/file/CreateReportAction.js";

class ReportTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "report";
    this.label = "analysis|tool.report.label";
    this.className = "report";
    this.iconName = "analysis|report";

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

    contextMenu.addMenuItem(action(RunReportAction), "default:top");
    contextMenu.addMenuItem(action(EditReportAction), "edit:top");

    const createMenu = contextMenu.getMenu("menu.file.create");
    createMenu.addMenuItem(action(CreateReportAction,
      { label : "analysis|action.report" }));

    this.panel = fileExplorer;
  }

  execute()
  {
    const panel = this.panel;
    panel.visible = false;
    panel.title = this.label;
    panel.iconName = "analysis|report";
    panel.tool = this;
    panel.activateGroup("report");
    panel.visible = true;

    const reportPanel = panel.reportPanel;
    if (reportPanel)
    {
      if (Object.keys(reportPanel.summary).length > 0)
      {
        reportPanel.visible = true;
      }
    }
  }

  get fileExplorer()
  {
    return this.panel;
  }
}

export { ReportTool };
