import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { MessageDialog } from "./MessageDialog.js";
import { Result } from "../io/FileService.js";

class ACLEditorDialog extends Dialog
{
  constructor(application, fileService, aclFilePath)
  {
    super("title.acl_editor");
    this.application = application;
    this.setI18N(application.i18n);
    this.fileService = fileService;
    this.aclFilePath = aclFilePath;

    this.setSize(600, 400);

    this.editorView = Controls.addCodeEditor(
      this.bodyElem,
      "acl_json",
      "label.acl_permissions",
      "",
      { language: "json", height: "calc(100% - 8px)" }
    );

    this.createSaveButton();
  }

  createSaveButton() {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "acl-buttons-right";
    this.bodyElem.appendChild(buttonContainer);

    this.addButton("saveAcl", "button.save", () => {
      try {
        const json = this.editorView.state.doc.toString();
        const data = JSON.parse(json);
        
        this.fileService.setACL(this.aclFilePath, data, result => {
          if (result.status === Result.OK) {
            MessageDialog.create("title.acl_editor_success", "message.edit_acl_success")
              .setClassName("info")
              .setI18N(this.application.i18n).show();
            this.hide();
          } else {
            MessageDialog.create("title.acl_editor_error", "message.edit_acl_denied", result.message)
              .setClassName("error")
              .setI18N(this.application.i18n).show();
          }
        });
      } catch (error) {
        MessageDialog.create("Error", "message.edit_acl_error", error.message)
          .setClassName("error")
          .setI18N(this.application.i18n).show();
      }
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
    this.fileService.getACL(this.aclFilePath, result =>
    {
      this.show();
    });
  }
}

export { ACLEditorDialog };
