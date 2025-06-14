import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { MessageDialog } from "./MessageDialog.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { Toast } from "./Toast.js";
import { I18N } from "../i18n/I18N.js";
import { Result, ACL } from "../io/FileService.js";

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
    this.bodyElem.classList.add("flex_column");

    this.nameField = this.addTextField("name", "label.acl_path_editing", aclFilePath,
      "acl_directory");
    this.nameField.readOnly = true;

    this.editorView = Controls.addCodeEditor(
      this.bodyElem,
      "acl_json",
      "label.acl_permissions",
      "",
      { language: "json", height: "100%" }
    );

    this.createButtons();
  }

  createButtons()
  {
    const application = this.application;
    const buttonContainer = document.createElement("div");
    this.bodyElem.appendChild(buttonContainer);

    const saveAction = () => {
      try
      {
        const acl = new ACL();
        const json = this.editorView.state.doc.toString();
        acl.fromJSON(json);

        this.fileService.setACL(this.aclFilePath, acl, result => {
          if (result.status === Result.OK)
          {
            Toast.create("message.edit_acl_success")
              .setI18N(application.i18n).show();            
            this.hide();
          }
          else
          {
            this.handleError(result, saveAction);
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

    this.addButton("saveACL", "button.save", () => {
      ConfirmDialog.create("title.confirm_save", "question.confirm_save_changes")
        .setI18N(application.i18n)
        .setAcceptLabel("button.yes")
        .setCancelLabel("button.no")
        .setAction(saveAction)
        .show();
    });

    this.addButton("cancelACL", "button.cancel", () => {
      this.hide();
    });
  }

  handleError(result, onLogin, onFailed)
  {
    console.info(result);
    if (result.status === Result.INVALID_CREDENTIALS || result.status === Result.FORBIDDEN)
    {
      this.fileExplorer.requestCredentials(
        result.status === Result.INVALID_CREDENTIALS ?
        "message.invalid_credentials" : "message.action_denied",
        onLogin, onFailed);
    }
    else if (result.status === Result.BAD_REQUEST)
    {
      MessageDialog.create("title.acl_editor_error", result.message)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
    else
    {
      MessageDialog.create("ERROR", result.message)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
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
    this.fileService.getACL(this.aclFilePath, result =>
    {
      if (result.status === Result.OK)
      {
        this.setACL(result.data);
        this.show();
      }
      else
      {
        this.handleError(result,
          () => this.load());
      }
    });
  }
}

export { ACLEditorDialog };