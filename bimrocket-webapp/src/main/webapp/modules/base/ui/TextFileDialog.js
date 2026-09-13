/*
 * TextFileEditor.js
 *
 * @author realor
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";
import { Controls } from "platform/ui/Controls.js";
import * as CM from "platform/lib/codemirror.js";

class TextFileDialog extends Dialog
{
  constructor(fileExplorer)
  {
    super("base|title.text_editor");
    this.fileExplorer = fileExplorer;
    this._changed = false;
    this._fileName = null;

    const application = fileExplorer.application;

    this.setI18N(application.i18n);

    this.setSize(760, 600);
    this.bodyElem.classList.add("flex");
    this.bodyElem.classList.add("flex-column");

    this.nameField = this.addTextField("name", "label.name", "");
    this.nameField.setAttribute("spellcheck", "false");
    this.nameField.addEventListener("input", () =>
    {
      this.saveButton.disabled = !this.nameField.value.trim();
    });

    this.editorView = this.addCodeEditor("editor",
      "label.content", "", { className : "flex-grow-1" });

    this.saveButton = this.addButton("save",
      "button.save", () => this.onSave());

    this.closeButton = this.addButton("close",
      "button.close", () => this.hide());
  }

  get fileName()
  {
    return this.nameField.value;
  }

  set fileName(fileName)
  {
    this.nameField.value = fileName;
    this.saveButton.disabled = !fileName?.trim();
  }

  getContent()
  {
    return this.editorView.state.doc.toString();
  }

  setContent(content, language)
  {
    this._changed = false;

    if (!content || content !== this.getContent())
    {
      Controls.setCodeEditorDocument(this.editorView, content, { language });

      const changeListener = CM.EditorView.updateListener.of(update =>
      {
        if (update.docChanged && this.visible)
        {
          this._changed = true;
        }
      });

      this.editorView.dispatch(
      {
        effects: CM.StateEffect.appendConfig.of(changeListener),
        selection: CM.EditorSelection.cursor(0),
        scrollIntoView: true
      });
    }
  }

  onShow()
  {
    if (this.fileName === "")
    {
      this.nameField.focus();
    }
    else
    {
      this.editorView.focus();
    }
    this._fileName = this.fileName;
  }

  hide()
  {
    if (this._changed)
    {
      const application = this.fileExplorer.application;

      ConfirmDialog.create("title.confirm_save",
        "question.discard_changes", this.fileName)
        .setAction(() =>
        {
          this.setContent("");
          this._changed = false;
          this._fileName = null;
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

    if (fileExplorer.service)
    {
      const isNew = this.fileName !== this._fileName;
      if (isNew)
      {
        if (!await fileExplorer.confirmSave(this.fileName)) return;
      }

      fileExplorer.save(this.fileName, this.getContent(), () =>
      {
        this._changed = false;
        this._fileName = this.fileName;
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

export { TextFileDialog };
