/*
 * ServiceDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { CredentialsManager } from "../utils/CredentialsManager.js";

class ServiceDialog extends Dialog
{
  constructor(title, serviceTypeOptions, serviceType = null, service = null)
  {
    super(title);

    this.setSize(300, 376);

    this.services = null;

    this.serviceTypeSelect = this.addSelectField("svcType",
      "label.service_type", serviceTypeOptions, serviceType);
    this.nameElem = this.addTextField("svcName", "label.service_name",
      service?.name);
    this.nameElem.spellcheck = false;
    this.descriptionElem = this.addTextField("svcDesc", "label.service_desc",
      service?.description);
    this.urlElem = this.addTextField("svcUrl", "label.service_url",
      service?.url);
    this.urlElem.spellcheck = false;

    this.credentialsAliasElem = this.addTextField("svcCredAlias",
      "label.service_credentials_alias", service?.credentialsAlias);
    this.credentialsAliasElem.spellcheck = false;

    const credentials = service?.getCredentials() || {};
    this.usernameElem = this.addTextField("svcUsername",
      "label.service_user", credentials.username);
    this.usernameElem.spellcheck = false;
    this.passwordElem = this.addPasswordField("svcPassword",
      "label.service_pass", credentials.password);

    this.credentialsAliasElem.addEventListener("input", () => {
      let alias = this.credentialsAliasElem.value;
      if (alias)
      {
        let credentials = CredentialsManager.getCredentials(alias, false);
        if (credentials)
        {
          this.usernameElem.value = credentials.username;
          this.passwordElem.value = credentials.password;
        }
      }
    });

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.hide();

      const parameters = {
        name : this.nameElem.value.trim(),
        description : this.descriptionElem.value,
        url : this.urlElem.value,
        credentialsAlias : this.credentialsAliasElem.value,
        credentials : {
          username : this.usernameElem.value,
          password : this.passwordElem.value
        }
      };

      this.onSave(this.serviceTypeSelect.value, parameters);
    });

    this.saveButton.disabled = !this.isValidServiceName(service?.name);
    this.nameElem.addEventListener("input", () =>
    {
      const serviceName = this.nameElem.value;

      this.saveButton.disabled = !this.isValidServiceName(serviceName);
      if (this.saveButton.disabled)
      {
        this.nameElem.style.color = "red";
      }
      else
      {
        this.nameElem.style.color = "";
      }
    });

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  isValidServiceName(serviceName)
  {
    if (!serviceName) return false;
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(serviceName.trim())) return false;

    const services = this.services;
    if (services) // check if serviceName is already in use
    {
      if (services[serviceName]) return false;
    }

    return true;
  }

  onShow()
  {
    this.serviceTypeSelect.focus();
  }

  onSave(serviceType, name, description, url, username, password)
  {
  }

  onCancel()
  {
    this.hide();
  }
}

export { ServiceDialog };
