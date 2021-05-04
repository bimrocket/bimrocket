/**
 * MessageDialog.js
 * 
 * @author realor
 */

BIMROCKET.MessageDialog = class extends BIMROCKET.Dialog
{
  constructor(title, message, className)
  {
    super(title, 300, 200);
    let scope = this;
 
    this.bodyElem.classList.add(className);
    this.addText(message);
    this.addButton("confirm_accept", "Accept", function(){ scope.hide();});
  }
};
