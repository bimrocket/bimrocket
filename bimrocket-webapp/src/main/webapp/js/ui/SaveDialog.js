/*
 * SaveDialog.js
 *
 * author: realor
 */

BIMROCKET.SaveDialog = class extends BIMROCKET.Dialog
{
  static DEFAULT_EXPORT_FORMAT = "dae";
  
  constructor(title, name)
  {
    super(title, 240, 200);

    if (name === "")
    {
      name = "scene";
    }    
    this.nameElem = this.addTextField("saveEntryName", "Name:", name);

    this.addButton("save", "Save", () => 
    {
      this.hide();
      this.setExtension(this.formatSelect.value);
      this.onSave(this.nameElem.value, this.formatSelect.value, false);
    });
    let options = [];
    for (let formatName in BIMROCKET.IOManager.formats)
    {
      let format = BIMROCKET.IOManager.formats[formatName];
      if (format.exporterClass)
      {
        options.push([formatName, format.description]);
      }
    }
    let formatInfo = BIMROCKET.IOManager.getFormatInfo(name);
    let format = formatInfo && formatInfo.exporterClass ?
      formatInfo.extension : BIMROCKET.SaveDialog.DEFAULT_EXPORT_FORMAT;
    this.setExtension(format);

    this.formatSelect = this.addSelectField("saveFormat", "Format:", 
      options, format);
    this.formatSelect.addEventListener("change", 
      event => this.setExtension(this.formatSelect.value));
        
    this.cancelButton = this.addButton("cancel", "Cancel", 
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
};
