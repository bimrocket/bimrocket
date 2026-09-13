import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Controls } from "platform/ui/Controls.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { ErrorHandler } from "platform/ui/ErrorHandler.js";
import { I18N } from "platform/i18n/I18N.js";
import { Result, ACL } from "platform/io/FileService.js";

class ACLEditorDialog extends Dialog
{
  constructor(application, fileService, aclFilePath, fileExplorer)
  {
    super("title.acl_editor");
    this.application = application;
    this.setI18N(application.i18n);
    this.fileService = fileService;
    this.aclFilePath = aclFilePath;
    this.fileExplorer = fileExplorer;

    this.setSize(500, 500);

    this.bodyElem.classList.add("flex");
    this.bodyElem.classList.add("flex-column");

    this.nameField = this.addTextField("name", "label.acl_path_editing", aclFilePath,
      "acl_directory");
    this.nameField.readOnly = true;

    this.editorView = Controls.addCodeEditor(
      this.bodyElem,
      "acl_json",
      "label.acl_permissions",
      "",
      { language: "json", className : "flex-grow-1" }
    );

    this.createButtons();
  }

  createButtons()
  {
    const application = this.application;

    const saveAction = () =>
    {
      try
      {
        const acl = new ACL();
        const json = this.editorView.state.doc.toString();
        acl.fromJSON(json);

        this.application.progressBar.message = "Writing ACL...";
        this.application.progressBar.progress = undefined;
        this.application.progressBar.visible = true;

        this.fileService.setACL(this.aclFilePath, acl, result =>
        {
          this.application.progressBar.visible = false;

          if (result.status === Result.OK)
          {
            Toast.create("message.edit_acl_success")
              .setI18N(application.i18n).show();
            this.hide();
          }
          else
          {
            this.handleError(result.error, saveAction);
          }
        });
      }
      catch (error)
      {
        MessageDialog.create("ERROR", "message.edit_acl_json_error", error)
          .setClassName("error")
          .setI18N(application.i18n).show();
      }
    };

    this.addButton("saveACL", "button.save", () =>
    {
      ConfirmDialog.create("title.confirm_save", "question.confirm_save_changes")
        .setI18N(application.i18n)
        .setAcceptLabel("button.yes")
        .setCancelLabel("button.no")
        .setAction(saveAction)
        .show();
    });

    this.addButton("cancelACL", "button.cancel", () =>
    {
      this.hide();
    });
  }

  handleError(error, onResolved, onFailed)
  {
    ErrorHandler.handleError(this.application, this.fileService,
      error, false, onResolved, onFailed);
  }

  setACL(acl)
  {
    const json = acl.toJSON();
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: json }
    });
  }

  load()
  {
    this.application.progressBar.message = "Reading ACL...";
    this.application.progressBar.progress = undefined;
    this.application.progressBar.visible = true;

    this.fileService.getACL(this.aclFilePath, result =>
    {
      this.application.progressBar.visible = false;

      if (result.status === Result.OK)
      {
        this.setACL(result.data);
        this.show();
      }
      else
      {
        this.handleError(result.error, () => this.load());
      }
    });
  }

  onHide()
  {
    this.editorView.destroy();
  }
}

export { ACLEditorDialog };