/*
 * ReportTypeDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { ReportType } from "../reports/ReportType.js";

class ReportTypeDialog extends Dialog
{
  constructor(application, acceptAction)
  {
    super("title.report_type");
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(280, 130);

    const reportTypes = ReportType.types;
    const options = [];
    for (let reportTypeName in reportTypes)
    {
      let reportType = reportTypes[reportTypeName];
      options.push([reportTypeName, reportType.getDescription()]);
    }

    this.reportTypeSelect = this.addSelectField("reportType",
      "label.report_type", options);

    this.acceptButton = this.addButton("reportType_accept", "button.accept",
      () => {
        this.hide();
        let reportTypeName = this.reportTypeSelect.value;
        acceptAction(reportTypeName);
      });

    this.cancelButton = this.addButton("reportType_cancel", "button.cancel",
      () => this.hide());
  }

  onShow()
  {
    this.reportTypeSelect.focus();
  }
}

export { ReportTypeDialog };
