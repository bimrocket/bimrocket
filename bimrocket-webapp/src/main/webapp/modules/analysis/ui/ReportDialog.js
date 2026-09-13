/*
 * ReportDialog.js
 *
 * @author realor
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Controls } from "platform/ui/Controls.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";
import { Report } from "platform/reports/Report.js";
import { ReportType } from "platform/reports/ReportType.js";
import { I18N } from "platform/i18n/I18N.js";
import * as CM from "platform/lib/codemirror.js";

class ReportDialog extends Dialog
{
  constructor(fileExplorer)
  {
    super("analysis|title.report_editor");
    this.fileExplorer = fileExplorer;
    this.reportTypeName = ReportType.getDefaultReportTypeName();
    this.reportPanel = null;
    this._changed = false;
    this._reportName = null;

    const application = fileExplorer.application;

    this.setI18N(application.i18n);

    this.setSize(760, 600);
    this.bodyElem.classList.add("flex");
    this.bodyElem.classList.add("flex-column");

    this.nameField = this.addTextField("name", "analysis|tool.report.name", "",
      "report_name");
    this.nameField.setAttribute("spellcheck", "false");
    this.nameField.addEventListener("input", () =>
    {
      this.saveButton.disabled = !this.nameField.value.trim();
    });

    this.editorView = this.addCodeEditor("editor",
      "analysis|tool.report.rules", "", { "className": "flex-grow-1" });

    this.errorElem = document.createElement("div");
    this.bodyElem.appendChild(this.errorElem);
    this.errorElem.style.display = "none";
    this.errorElem.style.color = "red";

    this.saveButton = this.addButton("save",
      "button.save", () => this.onSave());

    this.runButton = this.addButton("run",
      "button.run", () => this.run());

    this.closeButton = this.addButton("close",
      "button.close", () => this.hide());
  }

  get reportName()
  {
    return this.nameField.value;
  }

  set reportName(reportName)
  {
    this.nameField.value = reportName;
    this.saveButton.disabled = !reportName?.trim();
  }

  get reportSource()
  {
    return this.editorView.state.doc.toString();
  }

  set reportSource(source)
  {
    this._changed = false;

    if (!source || source !== this.reportSource)
    {
      const reportType = ReportType.getReportType(this.reportTypeName);

      Controls.setCodeEditorDocument(this.editorView, source,
      { language : reportType.getSourceLanguage() });

      const changeListener = CM.EditorView.updateListener.of(update =>
      {
        if (update.docChanged && this.visible)
        {
          this._changed = true;
          this.runButton.disabled = true;
          this.showError("");
        }
      });

      this.editorView.dispatch(
      {
        effects: CM.StateEffect.appendConfig.of(changeListener)
      });
    }
  }

  onShow()
  {
    if (this.reportName === "")
    {
      this.nameField.focus();
    }
    else
    {
      this.editorView.focus();
    }
    this._reportName = this.reportName;
    this.showError("");
  }

  hide()
  {
    if (this._changed)
    {
      const application = this.fileExplorer.application;

      ConfirmDialog.create("title.confirm_save",
        "question.discard_changes", this.reportName)
        .setAction(() =>
        {
          this.reportSource = "";
          this._changed = false;
          super.hide();

          Toast.create("message.changes_discarded")
            .setI18N(application.i18n).show();
        })
        .setI18N(application.i18n)
        .setAcceptLabel("button.yes")
        .setCancelLabel("button.no")
        .show();
    }
    else
    {
      super.hide();
    }
  }

  async onSave()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    if (this.isError() || this.validate())
    {
      this.completeName();

      if (fileExplorer.service)
      {
        const isNew = this.reportName !== this._reportName;
        if (isNew)
        {
          if (!await fileExplorer.confirmSave(this.reportName)) return;
        }

        fileExplorer.save(this.reportName, this.reportSource, () =>
        {
          this._changed = false;
          this._reportName = this.reportName;
          this.runButton.disabled = false;
          this.showError("");
        });
      }
      else
      {
        MessageDialog.create("ERROR", "message.select_directory")
          .setClassName("error")
          .setI18N(application.i18n).show();
      }
    }
  }

  run()
  {
    super.hide();
    const reportPanel = this.reportPanel;
    reportPanel.runReports({
      source : this.reportSource,
      type : this.reportTypeName
    });
    reportPanel.title = this.reportName;
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
      this.showError(ex);
    }
    return false;
  }

  completeName()
  {
    const reportTypeName = this.reportTypeName;
    const reportName = this.reportName.toLowerCase();

    if (!reportName.endsWith("." + reportTypeName))
    {
      this.reportName += "." + reportTypeName;
    }
  }

  isError()
  {
    return this.errorElem.style.display === "";
  }

  showError(error)
  {
    const errorElem = this.errorElem;
    const saveButton = this.saveButton;
    const isError = this.isError();

    if (error && !isError)
    {
      errorElem.textContent = error;
      errorElem.style.display = "";
      I18N.set(saveButton, "textContent", "button.save_with_errors");
      this.fileExplorer.application.i18n.update(saveButton);
    }

    if (!error && isError)
    {
      errorElem.textContent = "";
      errorElem.style.display = "none";
      I18N.set(saveButton, "textContent", "button.save");
      this.fileExplorer.application.i18n.update(saveButton);
    }
  }
}

export { ReportDialog };
