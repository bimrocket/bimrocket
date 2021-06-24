/*
 * BIMDataTool.js
 *
 * @autor: realor
 */

BIMROCKET.BIMDataTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_data";
    this.label = "tool.bim_data.label";
    this.help = "tool.bim_data.help";
    this.className = "bim_data";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object)
    {
      if (object._ifc)
      {
        const replacer = function(key, value)
        {
          return (key === "_helper") ? undefined : value;
        };      
        const json = JSON.stringify(object._ifc, replacer, 2);

        const dialog = new BIMROCKET.Dialog("BIM data", 500, 500);
        dialog.addCode(json);
        dialog.addButton("accept", "Accept", function() { dialog.hide(); });
        dialog.show();
      }
    }
    else
    {
      let dialog = new BIMROCKET.MessageDialog("BIM data", 
        "No object selected.");
      dialog.show();
    }
  }
};

