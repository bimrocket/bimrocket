/**
 * Toast.js
 *
 * @author: realor
 */

import { I18N } from "../i18n/I18N.js";

class Toast
{
  constructor(message)
  {
    this.message = message;
    this.millis = 2000;
    this.i18n = null;

    this.toastElem = document.createElement("div");
    this.toastElem.style.position = "absolute";
    this.toastElem.style.left = "50%";
    this.toastElem.style.opacity = 0;
    this.toastElem.className = "toast";
    I18N.set(this.toastElem, "innerHTML", message);

    this.setSize(180, 32);
    this.setTop(80);
    this.setClassName("toast");
  }

  static create(message)
  {
    return new Toast(message);
  }

  setClassName(className)
  {
    this.toastElem.classList.add(className);
    return this;
  }

  setMillis(millis)
  {
    this.millis = millis;
    return this;
  }

  setTop(top)
  {
    this.toastElem.style.top = top + "px";
    return this;
  }

  setI18N(i18n)
  {
    this.i18n = i18n;
    return this;
  }

  setSize(width, height)
  {
    this.toastElem.style.width = width + "px";
    this.toastElem.style.height = height + "px";
    this.toastElem.style.marginLeft = "-" + (width / 2) + "px";
    return this;
  }

  show()
  {
    if (!this.toastElem.parentNode)
    {
      if (this.i18n)
      {
        this.i18n.update(this.toastElem);
      }
      document.body.appendChild(this.toastElem);

      setTimeout(() => this.toastElem.style.opacity = 1, 500);
      setTimeout(() => this.hide(), 500 + this.millis);
    }
  }

  hide()
  {
    this.toastElem.style.opacity = 0;
    setTimeout(() =>
    {
      let parentNode = this.toastElem.parentNode;
      if (parentNode)
      {
        parentNode.removeChild(this.toastElem);
      }
    }, 1000);
  }
}

export { Toast };
