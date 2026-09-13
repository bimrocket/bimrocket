/*
 * ServiceLoginDialog.js
 *
 * @author alexis-i2cat
 * @author realor
 */

import { LoginDialog } from "platform/ui/dialog/LoginDialog.js";
import { Controls } from "platform/ui/Controls.js";
import { Auth } from "platform/ui/Auth.js";
import { I18N } from "platform/i18n/I18N.js";
import { ServerSession } from "platform/io/ServerSession.js";
import { ServiceError } from "platform/io/Service.js";

const { INVALID_CREDENTIALS, FORBIDDEN } = ServiceError;

class ServiceLoginDialog extends LoginDialog
{
	constructor(application)
	{
		super(application);

		this.onLogin = null;
		this.onFailed = null;
    this.oauthContainer = null;
  }

 /**
   * Sets the service to log in.
   *
   * @param {Service} service - the service to log in
   * @returns {ServiceLoginDialog}
   */
	setService(service)
	{
    this.serverSession = ServerSession.getSession(service);
    return this;
	}

 /**
   * Sets the function to call when login succeeds.
   *
   * @param {function} onLogin - the function to call when login succeeds
   * @returns {ServiceLoginDialog}
   */
  setOnLogin(onLogin)
	{
		this.onLogin = onLogin;
		return this;
	}

  /**
   * Sets the function to call when login fails.
   *
   * @param {function} onFailed - the function to call when login fails
   * @returns {ServiceLoginDialog}
   */
	setOnFailed(onFailed)
	{
		this.onFailed = onFailed;
		return this;
	}

  /**
   * Sets the isWriteAction property
   *
   * @param {boolean} isWriteAction - true if the action that generated
   *   the error is a write action, false otherwise
   * @returns {ServiceLoginDialog}
   */
  setWriteAction(isWriteAction)
  {
    this.isWriteAction = isWriteAction;
    return this;
  }

  /**
   * Sets the login message from the given error
   *
   * @param {ServiceError} error - the error that has ocurred
   * @returns {ServiceLoginDialog}
   */
  setError(error)
  {
    let message;
    if (error.code === INVALID_CREDENTIALS)
    {
      message = "message.invalid_credentials";
    }
    else if (error.code === FORBIDDEN)
    {
      message = this.isWriteAction ?
        "message.action_denied": "message.access_denied";
    }
    else if (error.message)
    {
      message = error.message;
    }
    else
    {
      message = String(error);
    }
    this.setMessage(message);
    return this;
  }

  show()
  {
    super.show();

    this.bc = new BroadcastChannel("auth");
    this.bc.onmessage = (event) =>
    {
      if (event.data.status === "ok")
      {
        this.hide();
        this.onLogin?.();
      }
    };

    this.loadOAuth2Providers();

    return this;
  }

  hide()
  {
    this.bc?.close();

    if (this.oauthWindow)
    {
      this.oauthWindow.close();
      this.oauthWindow = null;
    }

    super.hide();

    return this;
  }

	onCancel()
	{
		super.onCancel();
		this.onFailed?.();
	}

  loadOAuth2Providers()
  {
    const serverSession = this.serverSession;
    if (!serverSession) return;

    const baseUrl = serverSession.baseUrl;
    if (baseUrl === "" || baseUrl.startsWith("/"))
    {
      // Only show OAuth2 providers for same domain services
      serverSession.getOAuth2Providers((providers) =>
      {
        if (providers.length > 0) this.addOAuth2Buttons(providers);
      });
    }
  }

  addOAuth2Buttons(providers)
  {
    if (!this.oauthContainer)
    {
      this.oauthContainer = document.createElement("div");
      this.oauthContainer.className = "oauth_buttons";
      this.footerElem.append(this.oauthContainer);

      const authSystemsElem = document.createElement("div");
      I18N.set(authSystemsElem, "textContent", "label.other_auth_systems");
      this.oauthContainer.append(authSystemsElem);
      this.application.i18n.update(authSystemsElem);
    }
    else
    {
      this.oauthContainer.innerHTML = "";
    }

    providers.forEach((provider) =>
    {
      const buttonLabel = provider.name.toUpperCase();
      const authUrl = provider.authUrl;

      if (provider.logoUrl)
      {
        Controls.addImageButton(
          this.oauthContainer,
          `auth_${provider.name}`,
          buttonLabel,
          provider.logoUrl,
          () => this.oauthWindow = Auth.openAuthPopup(authUrl),
          "oauth_logo_btn"
        );
      }
      else
      {
        Controls.addButton(
          this.oauthContainer,
          `auth_${provider.name}`,
          buttonLabel,
          () => this.oauthWindow = Auth.openAuthPopup(authUrl)
        );
      }
    });
  }

  login(username, password)
  {
    const progressBar = this.application.progressBar;
    const serverSession = this.serverSession;
    if (!serverSession) return;

    progressBar.process = "undefined";
    progressBar.visible = true;

    serverSession.login(username, password, () =>
    {
      progressBar.visible = false;
      this.hide();
      this.onLogin?.();
    },
    error =>
    {
      progressBar.visible = false;
      this.setError(error);
      this.show();
    });
  }
}

export { ServiceLoginDialog }