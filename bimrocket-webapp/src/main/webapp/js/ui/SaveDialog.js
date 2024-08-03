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

    this.setSize(250, 200);

    if (name === undefined || name === null || name === "")
    {
      name = "scene";
    }
    this.nameElem = this.addTextField("saveEntryName", "label.name", name);
    this.nameElem.setAttribute("spellcheck", "false");

    let formatName = IOManager.getFormat(name);
    let formatInfo = IOManager.formats[formatName];

    if (!(formatInfo && formatInfo.exporter))
    {
      formatName = SaveDialog.DEFAULT_EXPORT_FORMAT;
      formatInfo = IOManager.formats[formatName];
    }
    let extension = formatInfo.extensions[0];
    this.setExtension(extension);

    let options = [];
    for (let formatName in IOManager.formats)
    {
      let formatInfo = IOManager.formats[formatName];
      if (formatInfo.exporter)
      {
        options.push([formatName, formatInfo.description]);
      }
    }

    this.formatSelect = this.addSelectField("saveFormat", "label.format",
      options, formatName);
    this.formatSelect.addEventListener("change",
      event => this.setExtension(this.formatSelect.value));

    this.saveSelectionElem = this.addCheckBoxField("save_sel",
      "label.save_selection", false);

    this.addButton("save", "button.save", () =>
    {
      this.hide();
      this.setExtension(this.formatSelect.value);
      this.onSave(this.nameElem.value, this.formatSelect.value,
        this.saveSelectionElem.checked);
    });

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
