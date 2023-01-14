/**
 * Dialog.js
 *
 * @author realor
 */

import { Controls } from "./Controls.js";
import { I18N } from "../i18n/I18N.js";

class Dialog
{
  constructor(title)
  {
    this.title = title;
    this.i18n = null;

    this.curtainElem = document.createElement("div");
    this.curtainElem.className = "dialog_curtain";

    this.dialogElem = document.createElement("div");
    this.dialogElem.className = "dialog";

    this.headerElem = document.createElement("div");
    I18N.set(this.headerElem, "textContent", title);
    this.headerElem.className = "header";
    this.dialogElem.appendChild(this.headerElem);

    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.dialogElem.appendChild(this.bodyElem);

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";
    this.dialogElem.appendChild(this.footerElem);

    this.setSize(300, 200);
  }

  setSize(width, height)
  {
    this.dialogElem.style.width = width + "px";
    this.dialogElem.style.height = height + "px";
    return this;
  }

  setI18N(i18n)
  {
    this.i18n = i18n;
    return this;
  }

  setClassName(className)
  {
    this.bodyElem.classList.add(className);
    return this;
  }

  show(parentNode)
  {
    if (!this.dialogElem.parentNode)
    {
      if (this.i18n)
      {
        this.i18n.updateTree(this.dialogElem);
      }
      parentNode = parentNode || document.body;
      parentNode.appendChild(this.curtainElem);
      parentNode.appendChild(this.dialogElem);
      if (this.onShow) this.onShow();
    }
    return this;
  }

  hide()
  {
    const parentNode = this.dialogElem.parentNode;
    if (parentNode)
    {
      parentNode.removeChild(this.dialogElem);
      parentNode.removeChild(this.curtainElem);
      if (this.onHide) this.onHide();
    }
    return this;
  }

  addText(text, className)
  {
    return Controls.addText(this.bodyElem, text, className);
  }

  addTextWithArgs(text, args, className)
  {
    return Controls.addTextWithArgs(this.bodyElem, text, args, className);
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

  addNumberField(name, label, value, className)
  {
    return Controls.addNumberField(this.bodyElem, name, label, value,
      className || "text_field");
  }

  addTextAreaField(name, label, value, className)
  {
    return Controls.addTextAreaField(this.bodyElem, name, label, value,
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

  addCheckBoxField(name, label, checked, className)
  {
    return Controls.addCheckBoxField(this.bodyElem, name, label, checked,
      className || "checkbox_field");
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

  addCodeEditor(name, label, value, options)
  {
    return Controls.addCodeEditor(this.bodyElem, name, label, value, options);
  }
}

export { Dialog };
