/**
 * ContextMenu.js
 *
 * @author realor
 */

import { I18N } from "../i18n/I18N.js";

class ContextMenu
{
  constructor(application, actions = [])
  {
    this.application = application;
    this.actions = actions;
    this.menuElement = document.createElement("menu");
    this.menuElement.className = "contextmenu";

    this.onClick = () => this.hide();
  }

  show(event)
  {
    const menuElement = this.menuElement;
    if (menuElement.parentElement)
    {
      this.hide();
    }

    menuElement.innerHTML = "";

    let firstLinkElem = null;

    for (let action of this.actions)
    {
      if (action.isEnabled())
      {
        const itemElem = document.createElement("li");
        itemElem.style.textAlign = "left";

        const linkElem = document.createElement("a");
        linkElem.href = "#";
        itemElem.appendChild(linkElem);
        linkElem.addEventListener("mouseover", event => linkElem.focus());
        linkElem.addEventListener("contextmenu", event => event.preventDefault());
        linkElem.addEventListener("click", () => action.perform());

        if (firstLinkElem === null) firstLinkElem = linkElem;

        I18N.set(linkElem, "textContent", action.getLabel());
        menuElement.appendChild(itemElem);

        this.application.i18n.update(linkElem);
      }
    }

    if (firstLinkElem)
    {
      document.body.appendChild(menuElement);
      document.body.addEventListener("click", this.onClick);
      firstLinkElem.focus();

      let x = event.pageX;
      let y = event.pageY;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const menuWidth = menuElement.offsetWidth;
      const menuHeight = menuElement.offsetHeight;
      const menuMaxX = x + menuWidth;
      const menuMaxY = y + menuHeight;

      if (menuMaxX > windowWidth) x -= (menuMaxX - windowWidth);
      if (menuMaxY > windowHeight) y -= (menuMaxY - windowHeight);

      menuElement.style.left = x + "px";
      menuElement.style.top = y + "px";
    }
  }

  hide()
  {
    const menuElement = this.menuElement;
    if (menuElement.parentElement === document.body)
    {
      document.body.removeChild(menuElement);
      document.body.removeEventListener("click", this.onClick);
    }
  }
}

export { ContextMenu }
