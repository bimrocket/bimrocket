/**
 * ConfirmDialog.js
 * 
 * @author realor
 */

BIMROCKET.ConfirmDialog = class extends BIMROCKET.Dialog
{
  constructor(title, message, action,
    acceptButtonText = "Accept", 
    cancelButtonText = "Cancel", 
    className = "confirm")
  {
    super(title, 300, 200);
    this.action = action;
    let scope = this;
 
    this.bodyElem.classList.add(className);
    this.addText(message);
    this.addButton("confirm_accept", acceptButtonText, () => scope.onAccept());
    this.addButton("confirm_cancel", cancelButtonText, () => scope.onCancel());
  }
  
  onAccept()
  {
    this.action();
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }
};
