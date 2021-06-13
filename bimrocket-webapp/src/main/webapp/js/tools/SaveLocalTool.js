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
  }

  activate()
  {
    let dialog = new BIMROCKET.SaveDialog("Save to local disk", "scene.stl");
    dialog.onSave = (name, format, onlySelection) => 
    {
      this.onSave(name, format, onlySelection);
    };
    dialog.onCancel = () => { dialog.hide(); this.application.useTool(null); };
    dialog.show();
  }
  
  deactivate()
  {    
  }

  onSave(name, format, onlySelection)
  {
    if (this.url)
    {
      window.URL.revokeObjectURL(this.url);
    }
    let intent =
    {
      object : this.application.selection.object,
      name : name || "scene.stl"
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
    this.application.useTool(null);
  }
};

