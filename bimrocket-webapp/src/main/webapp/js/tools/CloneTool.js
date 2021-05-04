/* 
 * CloneTool.js
 * 
 * @autor: realor
 */

BIMROCKET.CloneTool = class extends BIMROCKET.Tool
{
  constructor(application, options)
  {    
    super(application);
    this.name = "clone";
    this.label = "tool.clone.label";
    this.help = "tool.clone.help";
    this.className = "clone";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {  
    const application = this.application;
    let objects = application.selection.objects;
    let clone = null;
    for (let i = 0; i < objects.length; i++)
    {
      clone = application.cloneObject(objects[i]);
    }    
  }
};
