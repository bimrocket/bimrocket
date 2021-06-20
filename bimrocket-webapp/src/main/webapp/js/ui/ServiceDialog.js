/*
 * ServiceDialog.js
 *
 * author: realor
 */

BIMROCKET.ServiceDialog = class extends BIMROCKET.Dialog
{
  constructor(title, serviceTypeOptions, serviceType, 
    name, description, url, username, password)
  {
    super(title, 260, 330);

    this.serviceTypeSelect = this.addSelectField("svcType", "Service type:", 
      serviceTypeOptions, serviceType);
    this.nameElem = this.addTextField("svcName", "Service name:", name);
    this.nameElem.spellcheck = false;
    this.descriptionElem = this.addTextField("svcDesc", "Description:", 
      description);
    this.urlElem = this.addTextField("svcUrl", "URL:", url);
    this.urlElem.spellcheck = false;
    this.usernameElem = this.addTextField("svcUsername", "Username:", username);
    this.passwordElem = this.addPasswordField("svcPassword", "Password:", 
      password);

    this.addButton("save", "Save", () => 
    {
      this.hide();
      this.onSave(this.serviceTypeSelect.value,
        this.nameElem.value,
        this.descriptionElem.value,
        this.urlElem.value,
        this.usernameElem.value, 
        this.passwordElem.value);
    });
        
    this.cancelButton = this.addButton("cancel", "Cancel", 
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
};
