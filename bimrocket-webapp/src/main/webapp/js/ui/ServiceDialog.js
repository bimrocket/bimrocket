/*
 * ServiceDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class ServiceDialog extends Dialog
{
  constructor(title, serviceTypeOptions, serviceType = null, parameters = {})
  {
    super(title);

    this.setSize(260, 330);

    this.services = null;

    this.serviceTypeSelect = this.addSelectField("svcType",
      "label.service_type", serviceTypeOptions, serviceType);
    this.nameElem = this.addTextField("svcName", "label.service_name",
      parameters.name);
    this.nameElem.spellcheck = false;
    this.descriptionElem = this.addTextField("svcDesc", "label.service_desc",
      parameters.description);
    this.urlElem = this.addTextField("svcUrl", "label.service_url",
      parameters.url);
    this.urlElem.spellcheck = false;
    this.usernameElem = this.addTextField("svcUsername",
      "label.service_user", parameters.username);
    this.passwordElem = this.addPasswordField("svcPassword",
      "label.service_pass", parameters.password);

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.hide();

      const parameters = {
        name : this.nameElem.value.trim(),
        description : this.descriptionElem.value,
        url : this.urlElem.value,
        username : this.usernameElem.value,
        password : this.passwordElem.value
      };

      this.onSave(this.serviceTypeSelect.value, parameters);
    });

    this.saveButton.disabled = !this.isValidServiceName(parameters.name);
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
