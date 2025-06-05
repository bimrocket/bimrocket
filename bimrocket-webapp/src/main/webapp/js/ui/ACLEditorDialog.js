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
          } else 
          {
          let dialog;
          if (result.path === "message.invalid_acl_privileges") 
          {
            const details = result.metadata.entries.map(entry =>
              this.application.i18n.get("message.invalid_privilege_detail", {
                role: entry.role,
                privilege: entry.invalidPrivilege,
                options: entry.validOptions.join(', ')
              })
            ).join('\n');
            console.log(details);
            dialog = MessageDialog.create(
              "title.acl_editor_error",
              details
            );
          } 
          else 
          {
            dialog = MessageDialog.create(
              "title.acl_editor_error",
              result.message
            );
          }
          dialog.setClassName("error")
            .setI18N(this.application.i18n)
            .show();

          }
        });
      } catch (error) 
      {
        MessageDialog.create("Error", "message.edit_acl_error", error.message)
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
          ConfirmDialog.create("title.acl_not_found", "message.acl_not_found_create_new")
            .setI18N(this.application.i18n)
            .setAcceptLabel("button.yes")
            .setCancelLabel("button.no")
            .setAction(() => {
              this.setACL({});
              this.show();
            })
            .show();
        }
        else 
        {
          MessageDialog.create("message.action_denied", result.message)
            .setClassName("error")
            .setI18N(this.application.i18n)
            .show();
        }
      });
    };
    loadACL();
  }
}

export { ACLEditorDialog };
