/*
 * InputDialog.js
 *
 * @author realor
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";

class InputDialog extends Dialog
{
  constructor(title, message, value)
  {
    super(title);

    this.setSize(300, 140);

    this.inputElem = this.addTextField("inputName", message, value);
    this.inputElem.setAttribute("spellcheck", "false");

    this.acceptButton = this.addButton("accept", "button.accept",
      () => this.onAccept(this.inputElem.value), "main");

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  static create(title, message, ...args)
  {
    return new InputDialog(title, message, ...args);
  }

  setAcceptLabel(label)
  {
    I18N.set(this.acceptButton, "textContent", label);
    return this;
  }

  setAcceptClassName(className)
  {
    this.acceptButton.className = className;
    return this;
  }

  setAction(action)
  {
    this.action = action;
    return this;
  }

  onShow()
  {
    this.inputElem.focus();
  }

  onAccept(value)
  {
    this.action?.(value);
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }
}

export { InputDialog };
