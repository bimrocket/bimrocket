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
    this._maximized = false;
    this._width = 300;
    this._height = 200;

    this.curtainElem = document.createElement("div");
    this.curtainElem.className = "dialog_curtain";

    this.dialogElem = document.createElement("div");
    this.dialogElem.className = "dialog";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";
    this.dialogElem.appendChild(this.headerElem);

    this.minimizeButtonElem = document.createElement("button");
    this.minimizeButtonElem.className = "minimize";
    I18N.set(this.minimizeButtonElem, "aria-label", "button.minimize");
    I18N.set(this.minimizeButtonElem, "alt", "button.minimize");
    I18N.set(this.minimizeButtonElem, "title", "button.minimize");
    this.headerElem.appendChild(this.minimizeButtonElem);

    this.maximizeButtonElem = document.createElement("button");
    this.maximizeButtonElem.className = "maximize";
    I18N.set(this.maximizeButtonElem, "aria-label", "button.maximize");
    I18N.set(this.maximizeButtonElem, "alt", "button.maximize");
    I18N.set(this.maximizeButtonElem, "title", "button.maximize");
    this.headerElem.appendChild(this.maximizeButtonElem);

    this.titleElem = document.createElement("div");
    this.titleElem.className = "title";
    I18N.set(this.titleElem, "textContent", title);
    this.headerElem.appendChild(this.titleElem);

    this.closeButtonElem = document.createElement("button");
    this.closeButtonElem.className = "close";
    I18N.set(this.closeButtonElem, "aria-label", "button.close");
    I18N.set(this.closeButtonElem, "alt", "button.close");
    I18N.set(this.closeButtonElem, "title", "button.close");
    this.headerElem.appendChild(this.closeButtonElem);

    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.dialogElem.appendChild(this.bodyElem);

    this.footerElem = document.createElement("div");
    this.footerElem.className = "footer";
    this.dialogElem.appendChild(this.footerElem);

    this.minimizeButtonElem.addEventListener("click",
      () => this.maximized = false);

    this.maximizeButtonElem.addEventListener("click",
      () => this.maximized = true);

    this.closeButtonElem.addEventListener("click",
      () => this.hide());

    this.setSize(300, 200);
  }

  setSize(width, height)
  {
    this._width = width;
    this._height = height;
    this.updateLayout();
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

  get maximized()
  {
    this._maximized;
    this.updateLayout();
  }

  set maximized(maximized)
  {
    this._maximized = maximized;
    this.updateLayout();
  }

  updateLayout()
  {
    if (this._maximized)
    {
      this.dialogElem.classList.add("maximized");
      this.dialogElem.style.width = this.dialogElem.style.maxWidth;
      this.dialogElem.style.height = this.dialogElem.style.maxHeight;
    }
    else
    {
      this.dialogElem.classList.remove("maximized");
      this.dialogElem.style.width = this._width + "px";
      this.dialogElem.style.height = this._height + "px";
    }
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
