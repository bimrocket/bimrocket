/**
 * ConfirmDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { I18N } from "../i18n/I18N.js";

class ConfirmDialog extends Dialog
{
  action = null;

  constructor(title, message, ...args)
  {
    super(title);

    this.addTextWithArgs(message, args);
    this.acceptButton = this.addButton("confirm_accept", "button.accept",
      () => this.onAccept());
    this.cancelButton = this.addButton("confirm_cancel", "button.cancel",
      () => this.onCancel());
    this.setClassName("confirm");
  }

  static create(title, message, ...args)
  {
    return new ConfirmDialog(title, message, ...args);
  }

  setAction(action)
  {
    this.action = action;
    return this;
  }

  setAcceptLabel(label)
  {
    I18N.set(this.acceptButton, "innerHTML", label);
    return this;
  }

  setCancelLabel(label)
  {
    I18N.set(this.cancelButton, "innerHTML", label);
    return this;
  }

  onShow()
  {
    this.cancelButton.focus();
  }

  onAccept()
  {
    this.action();
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }
}

export { ConfirmDialog };
