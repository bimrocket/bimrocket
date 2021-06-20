/*
 * Dialog.js
 *
 * author: realor
 */

BIMROCKET.Dialog = class
{
  constructor(title, width, height)
  {
    this.curtainElem = document.createElement("div");
    this.curtainElem.className = "dialog_curtain";
    this.curtainElem.style.position = "absolute";
    this.curtainElem.style.top = "0";
    this.curtainElem.style.bottom = "0";
    this.curtainElem.style.left = "0";
    this.curtainElem.style.right = "0";

    this.dialogElem = document.createElement("div");
    this.dialogElem.className = "dialog";
    this.dialogElem.style.position = "absolute";
    this.dialogElem.style.width = width + "px";
    this.dialogElem.style.height = height + "px";
    this.dialogElem.style.left = "50%";
    this.dialogElem.style.marginLeft = "-" + (width / 2) + "px";
    this.dialogElem.style.top = "50%";
    this.dialogElem.style.marginTop = "-" + (height / 2) + "px";

    this.headerElem = document.createElement("div");
    this.headerElem.innerHTML = title;
    this.headerElem.className = "header";
    this.dialogElem.appendChild(this.headerElem);

    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.dialogElem.appendChild(this.bodyElem);

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";
    this.dialogElem.appendChild(this.footerElem);
  }

  addText(text, className)
  {
    return Controls.addText(this.bodyElem, text, className);
  }

  addCode(text, className)
  {
    return Controls.addCode(this.bodyElem, text, className);
  }

  addTextField(name, label, value, className)
  {
    return Controls.addTextField(this.bodyElem, name, label, value, 
      className || "text_field");
  }

  addPasswordField(name, label, value, className)
  {
    return Controls.addPasswordField(this.bodyElem, name, label, value, 
      className || "text_field");
  }

  addSelectField(name, label, options, value, className)
  {
    return Controls.addSelectField(this.bodyElem, name, label, 
      options, value, className || "select_field");
  }

  addRadioButtons(name, options, value, className)
  {
    return Controls.addRadioButtons(this.bodyElem, name, options, 
      value, className || "radio_buttons");
  }

  addButton(name, label, action)
  {
    return Controls.addButton(this.footerElem, name, label, action);
  }

  show(parentNode)
  {
    if (!this.dialogElem.parentNode)
    {
      parentNode = parentNode || document.body;
      parentNode.appendChild(this.curtainElem);
      parentNode.appendChild(this.dialogElem);
      if (this.onShow) this.onShow();
    }
  }

  hide()
  {
    var parentNode = this.dialogElem.parentNode;
    if (parentNode)
    {
      parentNode.removeChild(this.dialogElem);
      parentNode.removeChild(this.curtainElem);
      if (this.onHide) this.onHide();
    }
  }
};
