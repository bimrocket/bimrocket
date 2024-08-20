/*
 * ReportDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Toast } from "../ui/Toast.js";
import { Report } from "../reports/Report.js";
import { ReportType } from "../reports/ReportType.js";
import * as THREE from "../lib/three.module.js";

class ReportDialog extends Dialog
{
  constructor(application, saveAction)
  {
    super("title.report_editor");
    this.application = application;
    this.setI18N(this.application.i18n);
    this.reportName = "";
    this.reportSource = "";
    this.reportTypeName = ReportType.getDefaultReportTypeName();
    this.reportPanel = null;
    this.saved = true;

    this.setSize(760, 600);

    this.nameField = this.addTextField("name", "tool.report.name", "",
      "report_name");
    this.nameField.setAttribute("spellcheck", "false");

    this.editorView = this.addCodeEditor("editor",
      "tool.report.rules", "",
      { "height" : "calc(100% - 38px)" });

    this.runButton = this.addButton("run", "button.run", () =>
    {
      this.endEdition();
      this.hide();
      this.run();
    });

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.endEdition();

      if (this.validate())
      {
        this.addExtension();
        saveAction(this.reportName, this.reportSource);
      }
    });

    this.saveButton.style.display = saveAction ? "" : "none";

    this.closeButton = this.addButton("cancel", "button.close", () =>
    {
      this.endEdition();
      this.hide();
    });

    this.nameField.addEventListener("input", () =>
    {
      this.saveButton.disabled = this.nameField.value.trim().length === 0;
    });
  }

  onShow()
  {
    this.nameField.value = this.reportName;

    const reportType = ReportType.getReportType(this.reportTypeName);

    Controls.setCodeEditorDocument(this.editorView, this.reportSource,
      { "language" : reportType?.getSourceLanguage() });

    this.saveButton.disabled = this.nameField.value.trim().length === 0;
    if (this.reportName === "")
    {
      this.nameField.focus();
    }
    else
    {
      this.editorView.focus();
    }
  }

  validate()
  {
    try
    {
      const reportType = ReportType.getReportType(this.reportTypeName);
      if (reportType)
      {
        reportType.parse(this.reportSource);
      }
      return true;
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", ex)
        .setClassName("error")
        .setI18N(this.application.i18n)
        .show();
    }
    return false;
  }

  endEdition()
  {
    this.reportName = this.nameField.value;
    let source = this.editorView.state.doc.toString();
    if (source !== this.reportSource)
    {
      this.reportSource = source;
      this.saved = false;
    }
  }

  run()
  {
    const reportPanel = this.reportPanel;
    if (reportPanel)
    {
      reportPanel.execute(this.reportName, this.reportSource, this.reportTypeName);
    }
  }

  addExtension()
  {
    const defaultReportTypeName = ReportType.getDefaultReportTypeName();
    const reportTypeName = this.reportTypeName;
    const reportName = this.reportName.toLowerCase();

    if (reportTypeName !== defaultReportTypeName
        || reportName.includes("."))
    {
      if (!reportName.endsWith("." + reportTypeName))
      {
        this.reportName += "." + reportTypeName;
      }
    }
  }
}

export { ReportDialog };
