import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { MessageDialog } from "./MessageDialog.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { I18N } from "../i18n/I18N.js";
import { Result } from "../io/FileService.js";

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

    this.setSize(600, 500);

    this.nameField = this.addTextField("name", "label.acl_path_editing", aclFilePath === "/" ? "/Remote" : aclFilePath,
      "acl_directory");

    this.editorView = Controls.addCodeEditor(
      this.bodyElem,
      "acl_json",
      "label.acl_permissions",
      "",
      { language: "json", height: "calc(100% - 8px)" }
    );

    this.createSaveButton();
  }

  createSaveButton() 
  {
    const buttonContainer = document.createElement("div");
    this.bodyElem.appendChild(buttonContainer);

    const saveAction = () => {
      try 
      {
        const json = this.editorView.state.doc.toString();
        const data = JSON.parse(json);
        this.fileService.setACL(this.aclFilePath, data, result => {
          if (result.status === Result.OK) 
          {
            MessageDialog.create("title.acl_editor_success", "message.edit_acl_success")
              .setClassName("info")
              .setI18N(this.application.i18n).show();
            this.hide();
          }
          else if (result.status === Result.BAD_REQUEST) 
          { 
            MessageDialog.create("title.acl_editor_error", "message.invalid_privileges")
              .setClassName("error")
              .setI18N(this.application.i18n).show();
          }
          else 
          {
            MessageDialog.create("title.acl_editor_error", "message.edit_acl_denied", result.message)
              .setClassName("error")
              .setI18N(this.application.i18n).show();
          }
        });
      } 
      catch (error) 
      {
        MessageDialog.create("title.acl_editor_error", "message.edit_acl_json_error", error.message)
          .setClassName("error")
          .setI18N(this.application.i18n).show();
      }
    };

    this.addButton("saveACL", "button.save", () => {
      ConfirmDialog.create("title.confirm_save", "question.confirm_save_changes")
        .setI18N(this.application.i18n)
        .setAcceptLabel("button.yes")
        .setCancelLabel("button.no")
        .setAction(saveAction)
        .show();
    });
  }

  setACL(data)
  {
    const json = JSON.stringify(data, null, 2);
    this.editorView.dispatch({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: json }
    });
  }
  
  load() 
  {
    const loadACL = () => {
      this.fileService.getACL(this.aclFilePath, result => 
      {
        if (result.status === Result.OK) 
        {
          this.setACL(result.message);
          this.show();
        } 
        else if (result.status === Result.INVALID_CREDENTIALS || result.status === Result.FORBIDDEN) 
        {
          this.fileExplorer.requestCredentials(
            result.status === Result.INVALID_CREDENTIALS ? 
              "message.invalid_credentials" : "message.action_denied",
            () => loadACL()
          );
        }
        else if (result.status === Result.ERROR) 
        {
          MessageDialog.create("Error", result.message)
            .setClassName("error")
            .setI18N(this.application.i18n).show();
        }
        else 
        {
          MessageDialog.create("message.action_denied", result.message)
            .setClassName("error")
            .setI18N(this.application.i18n).show();
        }
      });
    };
    loadACL();
  }
}

export { ACLEditorDialog };