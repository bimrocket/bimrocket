/**
 * MessageDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class MessageDialog extends Dialog
{
  constructor(title, message, ...args)
  {
    super(title);

    if (typeof message !== "string")
    {
      message = String(message);
    }

    this.addTextWithArgs(message, args);
    let button = this.addButton("confirm_accept", "button.accept",
      () => this.hide());
    this.onShow = () => button.focus();
  }

  static create(title, message, ...args)
  {
    return new MessageDialog(title, message, ...args);
  }
}

export { MessageDialog };
