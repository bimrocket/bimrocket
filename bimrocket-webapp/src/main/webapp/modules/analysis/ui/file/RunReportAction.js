/**
 * RunReportAction.js
 *
 * @author realor
 */

import { ReportAction } from "./ReportAction.js";
import { FileExplorer } from "platform/ui/file/FileExplorer.js";

class RunReportAction extends ReportAction
{
  constructor(fileExplorer, options)
  {
    super(fileExplorer, options);
  }

  getLabel()
  {
    return "analysis|action.run_report";
  }

  getIconName()
  {
    return "run";
  }

  isDefaultAction()
  {
    return true;
  }

  perform()
  {
    this.fileExplorer.open((url, result) =>
    {
      this.setReport(url, result.data, null, true);
    });
  }
}

export { RunReportAction };
