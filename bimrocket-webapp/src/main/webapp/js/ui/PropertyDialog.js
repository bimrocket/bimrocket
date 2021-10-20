/*
 * PropertyDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class PropertyDialog extends Dialog
{
  constructor(application, object, dictionary)
  {
    super("title.object_properties");
    this.application = application;
    this.object = object;
    this.dictionary = dictionary;
    this.setI18N(this.application.i18n);

    this.setSize(240, 210);

    this.nameElem = this.addTextField("propertyName",
      "label.property_name", "");
    this.typeElem = this.addSelectField("propertyType",
      "label.property_type", ["string", "number", "boolean", "object"]);
    this.valueElem = this.addTextField("propertyValue",
       "label.property_value", "");

    this.acceptButton = this.addButton("accept", "button.accept",
      () => this.onAccept());

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    this.nameElem.focus();
  }

  onAccept()
  {
    this.hide();
    const propertyName = this.nameElem.value;
    const propertyType = this.typeElem.value;
    const propertyValue = this.valueElem.value;
    const dictionary = this.dictionary;
    switch (propertyType)
    {
      case "string":
        dictionary[propertyName] = propertyValue;
        break;
      case "number":
        dictionary[propertyName] = Number(propertyValue);
        break;
      case "boolean":
        dictionary[propertyName] = Boolean(propertyValue);
        break;
      case "object":
        dictionary[propertyName] = {};
        break;
    }
    this.application.notifyObjectsChanged(this.object, this);
  }

  onCancel()
  {
    this.hide();
  }
}

export { PropertyDialog };
