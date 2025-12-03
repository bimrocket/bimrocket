/**
 * MessageDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { I18N } from "../i18n/I18N.js";

class MessageDialog extends Dialog
{
  action = null;

  constructor(title, message, ...args)
  {
    super(title);

    if (typeof message !== "string")
    {
      message = String(message);
    }

    this.addTextWithArgs(message, args);
    this.acceptButton = this.addButton("confirm_accept", "button.accept",
      () => this.onAccept());
  }

  static create(title, message, ...args)
  {
    return new MessageDialog(title, message, ...args);
  }

  setAction(action)
  {
    this.action = action;
    return this;
  }

  setAcceptLabel(label)
  {
    I18N.set(this.acceptButton, "textContent", label);
    return this;
  }

  onAccept()
  {
    if (this.action) this.action();
    this.hide();
  }

  onShow()
  {
    this.acceptButton.focus();
  }
}

export { MessageDialog };
