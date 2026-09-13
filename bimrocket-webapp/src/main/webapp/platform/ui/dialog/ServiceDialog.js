/*
 * ServiceDialog.js
 *
 * @author realor
 */

import { Dialog } from "platform/ui/dialog/Dialog.js";
import { ServerSession } from "platform/io/ServerSession.js";

class ServiceDialog extends Dialog
{
  constructor(title, serviceTypeOptions, serviceType = null, service = null)
  {
    super(title);

    this.setSize(360, 320);

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

    // add serverType field
    const serverTypeOptions = ServerSession.getClassNames();
    this.serverTypeSelect = this.addSelectField("svcServerType",
      "label.server_type", serverTypeOptions, service?.serverType);

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.hide();

      const parameters = {
        name : this.nameElem.value.trim(),
        description : this.descriptionElem.value,
        url : this.urlElem.value,
        serverType : this.serverTypeSelect.value
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

  onSave(serviceType, parameters)
  {
  }

  onCancel()
  {
    this.hide();
  }
}

export { ServiceDialog };