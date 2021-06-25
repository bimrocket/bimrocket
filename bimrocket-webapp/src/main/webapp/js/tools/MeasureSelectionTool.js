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
    const dialog = new BIMROCKET.Dialog("Measure selection", 240, 160);
    dialog.addText("Solids: " + solids, "row");
    dialog.addText("Area: " + area, "row");
    dialog.addText("Volume: " + volume, "row");
    let av = volume === 0 ? 0 : area/volume;
    dialog.addText("Area/Volume: " + av, "row");
    let button = dialog.addButton("accept", "Accept", 
      () => dialog.hide());
    dialog.onShow = () => button.focus();
    dialog.show();
  }
};