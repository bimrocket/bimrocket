/**
 * CreateReportAction.js
 *
 * @author realor
 */

import { ReportAction } from "./ReportAction.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";
import { ReportType } from "platform/reports/ReportType.js";
import { ReportTypeDialog } from "../ReportTypeDialog.js";

class CreateReportAction extends ReportAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getLabel()
  {
    return this.options.label || "analysis|action.create_report";
  }

  getIconName()
  {
    return "analysis|report";
  }

  isEnabled()
  {
    return this.fileExplorer.isDirectoryList();
  }

  perform()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    const typeDialog = new ReportTypeDialog(application, reportTypeName =>
    {
      const reportType = ReportType.types[reportTypeName];
      const source = reportType.getDefaultSource();
      this.setReport("", source, reportTypeName, false);
    });
    typeDialog.show();
  }
}

export { CreateReportAction };
