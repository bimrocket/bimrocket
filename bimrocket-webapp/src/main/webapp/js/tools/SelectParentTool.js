/*
 * SelectParentTool.js
 *
 * @autor: realor
 */

BIMROCKET.SelectParentTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select_parent";
    this.label = "tool.select_parent.label";
    this.className = "select_parent";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const selection = this.application.selection;
    let objects = selection.objects;
    
    objects = objects.map(object => object.parent).filter(object => object);
    
    selection.set(...objects);
  }  
};