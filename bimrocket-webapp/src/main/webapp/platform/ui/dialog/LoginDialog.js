/*
 * LoginDialog.js
 *
 * @author realor
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { Controls } from "platform/ui/Controls.js";
import { I18N } from "platform/i18n/I18N.js";

class LoginDialog extends Dialog
{
  constructor(application, message)
  {
    super("title.login");
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(280, "auto");

    const formElem = document.createElement("form");
    formElem.id = "login_dialog";
    formElem.className = "body";

    this.bodyElem.appendChild(formElem);

    this.usernameElem = Controls.addTextField(formElem,
      "loginUser", "label.username", "");
    this.usernameElem.setAttribute("spellcheck", "false");

    this.passwordElem = Controls.addPasswordField(formElem,
      "loginPassword", "label.password", "");

    this.usernameElem.setAttribute("autocomplete", "username");
    this.passwordElem.setAttribute("autocomplete", "current-password");

    this.passwordElem.addEventListener("keypress", event =>
    {
      if (event.keyCode === 13)
      {
        this.onAccept();
      }
    });

    this.acceptButton = this.addButton("login_accept", "button.accept",
      () => this.onAccept());

    this.cancelButton = this.addButton("login_cancel", "button.cancel",
      () => this.onCancel());

    if (message)
    {
      this.setMessage(message);
    }
  }

	setMessage(message)
	{
		if (!this.errorElem)
		{
      this.errorElem = this.addText(message, "error block");
			this.bodyElem.insertBefore(this.errorElem, this.bodyElem.firstChild);
		}
		else
		{
			I18N.set(this.errorElem, "textContent", message);
		}
		return this;
	}

  onShow()
  {
    this.usernameElem.focus();
  }

  onAccept()
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
