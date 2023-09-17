/*
 * ReportDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Toast } from "../ui/Toast.js";
import * as THREE from "../lib/three.module.js";

class ReportDialog extends Dialog
{
  constructor(application, saveAction)
  {
    super("title.report_editor");
    this.application = application;
    this.setI18N(this.application.i18n);
    this.reportName = "";
    this.reportCode = "";

    this.setSize(760, 600);

    this.nameField = this.addTextField("name", "tool.report.name", "",
      "report_name");

    this.editorView = this.addCodeEditor("editor",
      "tool.report.rules", "",
      { "language" : "javascript",
        "height" : "calc(100% - 38px)" });

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.endEdition();

      if (this.validate())
      {
        saveAction(this.reportName, this.reportCode);
      }
    });

    this.saveButton.style.display = saveAction ? "" : "none";

    this.closeButton = this.addButton("cancel", "button.cancel", () =>
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
    const state = this.editorView.state;
    const tx = state.update(
      { changes: { from: 0, to: state.doc.length, insert: this.reportCode } });
    this.editorView.dispatch(tx);

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
      const fn = new Function(this.reportCode);
      fn();
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
    let code = this.editorView.state.doc.toString();
    if (code !== this.reportCode)
    {
      this.reportCode = code;
    }
  };
}

export { ReportDialog };
