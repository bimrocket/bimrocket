/**
 * Menu.js
 *
 * @author realor
 */

import { I18N } from "../i18n/I18N.js";

class AbstractMenuItem
{
  constructor(menuBar, label)
  {
    this.label = label;
    this.menuBar = menuBar;
    this.parentMenu = null;

    this.itemElement = document.createElement("li");
    this.anchorElement = document.createElement("a");
    this.anchorElement.href = "#";
    I18N.set(this.anchorElement, "innerHTML", label || "menuitem");
    this.itemElement.appendChild(this.anchorElement);

    this.anchorElement.addEventListener("pointerenter",
      () => this.anchorElement.focus());
  }
}

class MenuItem extends AbstractMenuItem
{
  constructor(menuBar, tool)
  {
    super(menuBar, tool.label);

    this.anchorElement.addEventListener("click", () =>
    {
      if (this.menuBar.isVertical())
      {
        this.menuBar.hide();
      }
      else
      {
        this.menuBar.focusMenuItem(null);
      }
      this.menuBar.application.useTool(tool);
    });

    this.anchorElement.addEventListener("focusin", () =>
    {
      this.menuBar.focusMenuItem(this);
    });
  }
}

class Menu extends AbstractMenuItem
{
  constructor(menuBar, label)
  {
    super(menuBar, label);
    this.menuItems = []; // child menuItems

    this.listElement = document.createElement("ul");
    this.itemElement.appendChild(this.listElement);
    this.anchorElement.className = "menu";

    this.anchorElement.addEventListener("click", event =>
    {
      event.preventDefault();
      if (this.isVisible() && this.menuBar.isVertical())
      {
        this.hide();
      }
      else
      {
        this.menuBar.armed = true;
        this.drop();
      }
    });

    this.anchorElement.addEventListener("contextmenu",
      event => event.preventDefault());

    this.anchorElement.addEventListener("focusin", () =>
    {
      menuBar.focusMenuItem(this);
      if (menuBar.armed && !menuBar.isVertical())
      {
        this.drop();
      }
    });
  }

  isVisible()
  {
    return this.itemElement.className === "drop";
  }

  drop()
  {
    this.itemElement.className = "drop";
  }

  hide(recursive)
  {
    this.itemElement.className = "hide";
    if (recursive)
    {
      for (let menuItem of this.menuItems)
      {
        if (menuItem instanceof Menu)
        {
          menuItem.hide(recursive);
        }
      }
    }
  }

  addMenuItem(tool)
  {
    let menuItem = new MenuItem(this.menuBar, tool);
    menuItem.parentMenu = this;
    this.menuItems.push(menuItem);
    this.listElement.appendChild(menuItem.itemElement);
    return menuItem;
  }

  addMenu(label, index)
  {
    let menu = new Menu(this.menuBar, label);
    menu.parentMenu = this;

    const children = this.listElement.children;
    if (typeof index === "number" && index < children.length)
    {
      if (index < 0) index = 0;
      let oldElem = children[index];
      this.listElement.insertBefore(menu.itemElement, oldElem);
      this.menuItems.splice(index, 0, menu);
    }
    else
    {
      this.menuItems.push(menu);
      this.listElement.appendChild(menu.itemElement);
    }
    return menu;
  }
};

/*** MenuBar ***/

class MenuBar
{
  constructor(application, element)
  {
    this.application = application;
    this.menuItem = null;
    this.menus = [];
    this.armed = false;

    this.navElement = document.createElement("nav");
    element.appendChild(this.navElement);

    this.listElement = document.createElement("ul");
    this.navElement.appendChild(this.listElement);

    const menuBar = this;
    this.dropButtonElement = document.createElement("a");
    I18N.set(this.dropButtonElement, "innerHTML", "button.menu_show");
    this.dropButtonElement.className = "menu_button";
    this.dropButtonElement.setAttribute("role", "button");
    this.dropButtonElement.setAttribute("aria-pressed", "false");
    this.dropButtonElement.addEventListener("click", () =>
    {
      if (this.isVisible())
      {
        menuBar.hide();
      }
      else
      {
        menuBar.drop();
      }
    });
    element.appendChild(this.dropButtonElement);

    document.body.addEventListener("pointerdown", event =>
    {
      if ((this.isVertical() && this.isVisible())
          || (!this.isVertical() && this.armed))
      {
        // click outside root menu element ?
        const rootMenuElement = this.navElement.parentElement;

        let element = event.srcElement;
        while (element !== null && element !== rootMenuElement)
        {
          element = element.parentElement;
        }
        if (element === null)
        {
          // click outside menu, hide menu
          event.preventDefault();

          if (this.isVertical())
          {
            this.hide();
          }
          else
          {
            this.hideAllMenus();
          }
        }
      }
    }, true);

    window.addEventListener('resize', () => this.hideAllMenus(), false);

    window.addEventListener('keyup', event =>
    {
      if (this.armed && event.keyCode === 27)
      {
        this.hideAllMenus();
      }
    }, false);
  }

  addMenu(label, index)
  {
    const menu = new Menu(this, label);

    const children = this.listElement.children;
    if (typeof index === "number" && index < children.length)
    {
      if (index < 0) index = 0;
      let oldElem = children[index];
      this.listElement.insertBefore(menu.itemElement, oldElem);
      this.menus.splice(index, 0, menu);
    }
    else
    {
      this.listElement.appendChild(menu.itemElement);
      this.menus.push(menu);
    }
    return menu;
  }

  isVisible()
  {
    return this.listElement.className === "menu_drop";
  }

  drop()
  {
    this.listElement.className = "menu_drop";
    I18N.set(this.dropButtonElement, "innerHTML", "button.menu_hide");
    this.application.i18n.update(this.dropButtonElement);
    this.dropButtonElement.setAttribute("aria-pressed", "true");
  }

  hide()
  {
    this.listElement.className = "menu_hide";
    I18N.set(this.dropButtonElement, "innerHTML", "button.menu_show");
    this.application.i18n.update(this.dropButtonElement);
    this.dropButtonElement.setAttribute("aria-pressed", "false");
    this.armed = false;
  }

  isVertical()
  {
    return document.body.clientWidth < 950;
  }

  focusMenuItem(menuItem)
  {
    if (!this.isVertical())
    {
      let menu;

      if (this.menuItem) // have previous menuItem
      {
        menu = this.menuItem.parentMenu;
        if (menu)
        {
          for (var i = 0; i < menu.menuItems.length; i++)
          {
            var sibling = menu.menuItems[i];
            if (sibling instanceof Menu)
            {
              sibling.hide(); // hide sibling menu
            }
          }

          do
          {
            menu.hide(); // hide parent menus
            menu = menu.parentMenu;
          } while (menu);
        }
        else
        {
          this.menuItem.hide();
        }
      }

      if (menuItem)
      {
        menu = menuItem.parentMenu;
        while (menu)
        {
          menu.drop(); // show parent menu
          menu = menu.parentMenu;
        }
      }
    }
    this.menuItem = menuItem;
    if (menuItem === null)
    {
      this.armed = false;
    }
  }

  hideAllMenus()
  {
    for (var i = 0; i < this.menus.length; i++)
    {
      let menu = this.menus[i];
      menu.hide(true);
    }
    this.menuItem = null;
    this.armed = false;
  }
}

export { MenuBar, Menu, MenuItem };