/*
 * SaveLocalTool.js
 *
 * @autor: realor
 */

BIMROCKET.SaveLocalTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "savelocal";
    this.label = "tool.savelocal.label";
    this.help = "tool.savelocal.help";
    this.className = "savelocal";
    this.url = null;
    this.setOptions(options);

    this._onClickSave = this.onClickSave.bind(this);
    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(
      "panel_" + this.name, this.label, "left");
    
    this.filenameElem = document.createElement("input");
    this.filenameElem.type = "text";
    this.filenameElem.value = "scene.stl";
    this.filenameElem.id = this.name + "_" + this.id + "_filename";
    this.panel.bodyElem.appendChild(this.filenameElem);

    this.saveButton = document.createElement("button");
    this.saveButton.innerHTML = "Save";
    this.saveButton.id = this.name + "_" + this.id + "_save";
    this.panel.bodyElem.appendChild(this.saveButton);

    this.saveButton.addEventListener("click", this._onClickSave, false);
  }

  activate()
  {
    this.panel.visible = true;
  }

  deactivate()
  {
    this.panel.visible = false;
  }

  onClickSave(event)
  {
    if (this.url)
    {
      window.URL.revokeObjectURL(this.url);
    }
    let intent =
    {
      object : this.application.selection.object,
      name : this.filenameElem.value || "scene.stl"
    };
    try
    {
      let data = BIMROCKET.IOManager.export(intent);
      this.url = window.URL.createObjectURL(data);

      let linkElem = document.createElement("a");
      linkElem.download = intent.name;
      linkElem.target = "_blank";
      linkElem.href = this.url;
      linkElem.style.display = "block";
      linkElem.click();
    }
    catch (ex)
    {
      let messageDialog = new BIMROCKET.MessageDialog("ERROR", ex, "error");
      messageDialog.show();
    }
  }
};

