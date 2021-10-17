/*
 * PropertyDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";

class PropertyDialog extends Dialog
{
  constructor(inspector, object, dictionary)
  {
    super("title.object_properties");
    this.inspector = inspector;
    this.object = object;
    this.dictionary = dictionary;
    this.setI18N(this.inspector.application.i18n);

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
    this.inspector.application.notifyObjectsChanged(this.object);
  }

  onCancel()
  {
    this.hide();
  }
}

export { PropertyDialog };
