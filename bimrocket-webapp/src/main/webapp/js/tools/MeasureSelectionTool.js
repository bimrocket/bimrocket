/* 
 * MeasureSelectionTool.js
 * 
 * @autor: realor
 */

BIMROCKET.MeasureSelectionTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "measure_selection";
    this.label = "tool.measure_selection.label";
    this.className = "measure_selection";
    this.setOptions(options);
    
    this.immediate = true;
  }

  execute()
  {
    let area = 0;
    let volume = 0;
    let solids = 0;

    const roots = this.application.selection.roots;
    for (let object of roots)
    {
      object.traverse(obj => 
      {
        if (obj instanceof BIMROCKET.Solid)
        {
          if (obj.visible)
          {
            solids++;
            area += obj.getArea();
            volume += obj.getVolume();
          }
        }
      });
    }
    const decimals = this.application.decimals;
    const units = " " + this.application.units;
    const dialog = new BIMROCKET.Dialog("Measure selection", 240, 160);
    dialog.addText("Solids: " + solids, "row");
    dialog.addText("Area: " + area.toFixed(decimals) + units + "2", "row");
    dialog.addText("Volume: " + volume.toFixed(decimals) + units +"3", "row");
    let av = volume === 0 ? 0 : area/volume;
    dialog.addText("Area/Volume: " + av.toFixed(decimals), "row");
    let button = dialog.addButton("accept", "Accept", 
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
};