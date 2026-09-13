/**
 * ReportAction.js
 *
 * @author realor
 */

import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { FileAction } from "platform/ui/file/FileAction.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";
import { Metadata } from "platform/io/FileService.js";
import { ReportType } from "platform/reports/ReportType.js";
import { ReportPanel } from "../ReportPanel.js";
import { ReportDialog } from "../ReportDialog.js";

class ReportAction extends FileAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);

    const application = fileExplorer.application;

    if (!fileExplorer.reportPanel)
    {
      fileExplorer.reportPanel = new ReportPanel(application);
      application.panelManager.addPanel(fileExplorer.reportPanel);
    }

    if (!fileExplorer.reportDialog)
    {
      fileExplorer.reportDialog = new ReportDialog(fileExplorer);
      fileExplorer.reportDialog.reportPanel = fileExplorer.reportPanel;
    }
  }

  isEnabled()
  {
    const fileExplorer = this.fileExplorer;

    const type = fileExplorer.getSelectedFileExtension();

    if (!type) return false;

    return Boolean(ReportType.types[type]);
  }

  setReport(url, source, reportTypeName = null, run = false)
  {
    const fileExplorer = this.fileExplorer;
    const reportDialog = fileExplorer.reportDialog;
    const reportPanel = fileExplorer.reportPanel;

    let index = url.lastIndexOf("/");
    let reportName = index === -1 ? url : url.substring(index + 1);

    if (reportTypeName === null)
    {
      index = reportName.lastIndexOf(".");
      reportTypeName = index === -1 ?
        ReportType.getDefaultReportTypeName() :
        reportName.substring(index + 1).toLowerCase();
    }

    if (run)
    {
      reportPanel.execute(reportName, source, reportTypeName);
    }
    else
    {
      reportDialog.reportName = reportName;
      reportDialog.reportTypeName = reportTypeName;
      reportDialog.reportSource = source;
      reportDialog.show();
    }
  }
}

export { ReportAction };
