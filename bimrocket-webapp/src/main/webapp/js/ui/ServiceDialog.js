/*
 * ServiceDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class ServiceDialog extends Dialog
{
  constructor(title, serviceTypeOptions, serviceType,
    name, description, url, username, password)
  {
    super(title);

    this.setSize(260, 330);

    this.serviceTypeSelect = this.addSelectField("svcType",
      "label.service_type", serviceTypeOptions, serviceType);
    this.nameElem = this.addTextField("svcName", "label.service_name", name);
    this.nameElem.spellcheck = false;
    this.descriptionElem = this.addTextField("svcDesc", "label.service_desc",
      description);
    this.urlElem = this.addTextField("svcUrl", "label.service_url", url);
    this.urlElem.spellcheck = false;
    this.usernameElem = this.addTextField("svcUsername",
      "label.service_user", username);
    this.passwordElem = this.addPasswordField("svcPassword",
      "label.service_pass", password);

    this.addButton("save", "button.save", () =>
    {
      this.hide();
      this.onSave(this.serviceTypeSelect.value,
        this.nameElem.value,
        this.descriptionElem.value,
        this.urlElem.value,
        this.usernameElem.value,
        this.passwordElem.value);
    });

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
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
