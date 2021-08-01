/* 
 * CloneTool.js
 * 
 * @author: realor
 */

import { Tool } from "./Tool.js";

class CloneTool extends Tool
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
    let objects = application.selection.roots;
    let clone = null;
    for (let i = 0; i < objects.length; i++)
    {
      clone = application.cloneObject(objects[i]);
    }    
  }
}

export { CloneTool };

