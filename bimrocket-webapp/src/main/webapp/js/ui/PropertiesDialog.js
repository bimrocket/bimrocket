/*
 * PropertiesDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { I18N } from "../i18n/I18N.js";

class PropertiesDialog extends Dialog
{
  constructor(application, object)
  {
    super("title.properties");
    this.application = application;
    this.object = object;
    this.setI18N(this.application.i18n);

    this.setSize(640, 500);

    let json = JSON.stringify(object.userData, null, 2);
    this.editorView = this.addCodeEditor("editor",
      "label.properties", json,
      { "language" : "json", "height" : "calc(100% - 50px" });

    this.errorElem = document.createElement("div");
    this.errorElem.className = "error";
    this.bodyElem.appendChild(this.errorElem);

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    this.editorView.focus();
  }

  onAccept()
  {
    try
    {
      const json = this.editorView.state.doc.toString();
      let properties = JSON.parse(json);
      this.object.userData = properties;
      this.application.notifyObjectsChanged(this.object, this);
      this.hide();
    }
    catch (ex)
    {
      this.errorElem.textContent = String(ex);
    }
  }

  onCancel()
  {
    this.hide();
  }
}

export { PropertiesDialog };
