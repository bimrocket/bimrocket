/*
 * SaveDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { IOManager } from "../io/IOManager.js";

class SaveDialog extends Dialog
{
  static DEFAULT_EXPORT_FORMAT = "brf";

  constructor(title, name)
  {
    super(title);

    this.setSize(240, 200);

    if (name === "")
    {
      name = "scene";
    }
    this.nameElem = this.addTextField("saveEntryName", "label.name", name);

    this.addButton("save", "button.save", () =>
    {
      this.hide();
      this.setExtension(this.formatSelect.value);
      this.onSave(this.nameElem.value, this.formatSelect.value, false);
    });
    let options = [];
    for (let formatName in IOManager.formats)
    {
      let format = IOManager.formats[formatName];
      if (format.exporterClass)
      {
        options.push([formatName, format.description]);
      }
    }
    let formatInfo = IOManager.getFormatInfo(name);
    let format = formatInfo && formatInfo.exporterClass ?
      formatInfo.extension : SaveDialog.DEFAULT_EXPORT_FORMAT;
    this.setExtension(format);

    this.formatSelect = this.addSelectField("saveFormat", "label.format",
      options, format);
    this.formatSelect.addEventListener("change",
      event => this.setExtension(this.formatSelect.value));

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    this.nameElem.focus();
  }

  onSave(name, format, onlySelection)
  {
    console.info("save " + name + " " + format + " " + onlySelection);
  }

  onCancel()
  {
    this.hide();
  }

  setExtension(extension)
  {
    let name = this.nameElem.value;
    let index = name.lastIndexOf(".");
    if (index !== -1)
    {
      name = name.substring(0, index + 1) + extension;
    }
    else
    {
      name += "." + extension;
    }
    this.nameElem.value = name;
  }
}

export { SaveDialog };
