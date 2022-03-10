/*
 * LoginDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class LoginDialog extends Dialog
{
  constructor(application)
  {
    super("title.login");
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(240, 180);

    this.usernameElem = this.addTextField("loginUser",
      "label.username", "");
    this.usernameElem.setAttribute("spellcheck", "false");

    this.passwordElem = this.addPasswordField("loginPassword",
      "label.password", "");

    this.passwordElem.addEventListener("keypress", event =>
    {
      if (event.keyCode === 13)
      {
        this.onAccept();
      }
    });

    this.acceptButton = this.addButton("accept", "button.accept",
      () => this.onAccept());

    this.acceptButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    this.usernameElem.focus();
  }

  onAccept(username, password)
  {
    this.hide();
    this.login(this.usernameElem.value, this.passwordElem.value);
  }

  onCancel()
  {
    this.hide();
  }

  login(username, password)
  {
  }
}

export { LoginDialog };
