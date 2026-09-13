/**
 * EditReportAction.js
 *
 * @author realor
 */

import { ReportAction } from "./ReportAction.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";

class EditReportAction extends ReportAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getLabel()
  {
    return "analysis|action.edit_report";
  }

  getIconName()
  {
    return "edit";
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      this.setReport(url, result.data, null, false);
    });
  }
}

export { EditReportAction };
