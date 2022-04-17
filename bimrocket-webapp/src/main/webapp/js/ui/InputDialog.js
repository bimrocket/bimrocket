/*
 * InputDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class InputDialog extends Dialog
{
  constructor(application, title, message, value)
  {
    super(title);
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(240, 120);

    this.inputElem = this.addTextField("inputName", message, value);
    this.inputElem.setAttribute("spellcheck", "false");

    this.acceptButton = this.addButton("accept", "button.accept",
      () => this.onAccept(this.inputElem.value));

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    this.inputElem.focus();
  }

  onAccept()
  {
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }
}

export { InputDialog };
