/**
 * Menu.js
 *
 * @author realor
 */

import { Action } from "./Action.js";
import { I18N } from "../i18n/I18N.js";

const MenuItemList = (BaseClass = class {}) => class extends BaseClass
{
  constructor(...args)
  {
    super(...args);
    this.menuItems = []; // child menuItems
    this.menuElement = document.createElement("menu");
    this.menuElement.setAttribute("role", "menu");
  }

  addMenuItem(action, index)
  {
    const menuItem = new MenuItem(this.container, action);
    this.putMenuItem(menuItem, index);

    return menuItem;
  }

  addMenu(label, index)
  {
    const menu = new Menu(this.container, label);
    this.putMenuItem(menu, index);

    return menu;
  }

  addSeparator(name, index)
  {
    const separator = new Separator(this.container, name);
    this.putMenuItem(separator, index);

    return separator;
  }

  hasChildren()
  {
    return this.menuItems.length > 0;
  }

  putMenuItem(menuItem, index)
  {
    if (menuItem.container !== this.container)
      throw "Invalid MenuItem container";

    if (menuItem.parentMenu)
      throw "This MenuItem is already included in a Menu";

    if (this instanceof Menu)
    {
      menuItem.parentMenu = this;
    }

    const children = this.menuElement.children;
    if (typeof index === "number" && index < children.length)
    {
      if (index < 0) index = 0;
      let oldElem = children[index];
      this.menuElement.insertBefore(menuItem.itemElement, oldElem);
      this.menuItems.splice(index, 0, menuItem);
    }
    else
    {
      this.menuElement.appendChild(menuItem.itemElement);
      this.menuItems.push(menuItem);
    }
    this.container.onMenuItemAdded(menuItem);
  }

  removeMenuItem(menuItem)
  {
    let index = this.menuItems.indexOf(menuItem);
    if (index !== -1)
    {
      this.menuItems.splice(index, 1);
      this.menuElement.removeChild(menuItem.itemElement);
      menuItem.parentMenu = null;
      this.container.onMenuItemRemoved(menuItem);
    }
  }

  getBounds()
  {
    let bounds;
    const menuElement = this.menuElement;
    const oldTransform = menuElement.style.transform;
    menuElement.style.transform = "";
    menuElement.style.transition = "0s";

    if (menuElement.checkVisibility())
    {
      bounds =  menuElement.getBoundingClientRect();
    }
    else
    {
      menuElement.style.visibility = "hidden";
      menuElement.style.display = "block";
      bounds = menuElement.getBoundingClientRect();
      menuElement.style.display = "";
      menuElement.style.visibility = "";
    }
    menuElement.style.transform = oldTransform;
    menuElement.style.transition = "";
    return bounds;
  }

  getOverflow()
  {
    const bounds = this.getBounds();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const maxX = bounds.x + bounds.width;
    const maxY = bounds.y + bounds.height;

    return { overflowX : maxX - windowWidth,
             overflowY : maxY - windowHeight,
             bounds };
  }

  fitsInWindow(horizontal = true, vertical = true)
  {
    let { overflowX, overflowY } = this.getOverflow();

    return (overflowX < 0 || !horizontal) && (overflowY < 0 || !vertical);
  }
};

class BaseMenuItem
{
  constructor(container)
  {
    this.container = container;
    this.parentMenu = null; // Menu

    this.itemElement = document.createElement("li");
    this.itemElement.setAttribute("role", "none");
  }

  remove()
  {
    (this.parentMenu || this.container)?.removeMenuItem(this);
  }

  isEnabled()
  {
    return false;
  }

  getNextActiveMenuItem(direction = 1, includeThis = false)
  {
    let menuItem = this;
    let menuContainer = this.parentMenu || this.container;
    const menuItems = menuContainer.menuItems;

    direction = Math.sign(direction);
    if (direction === 0) throw "Invalid menuItem direction";

    let index = menuItems.indexOf(menuItem);
    if (index === -1) throw "Invalid menuItem state";

    const isValidMenuItem = (menuItem) =>
    {
      return menuItem instanceof ActiveMenuItem && menuItem.isEnabled();
    };

    if (includeThis && isValidMenuItem(menuItem))
      return menuItem;

    let left = menuItems.length;
    let valid = false;
    do
    {
      index += direction;

      if (index < 0)
      {
        index = menuItems.length - 1;
      }
      else if (index >= menuItems.length)
      {
        index = 0;
      }
      menuItem = menuItems[index];
      valid = isValidMenuItem(menuItem);
      left--;
    } while (!valid && left > 0);

    return valid ? menuItem : null;
  }
}

class ActiveMenuItem extends BaseMenuItem
{
  constructor(container, label)
  {
    super(container);
    this.label = label;

    this.buttonElement = document.createElement("button");
    this.labelElement = document.createElement("span");
    this.labelElement.className = "label";
    this.setLabel(label);
    this.buttonElement.appendChild(this.labelElement);

    this.itemElement.appendChild(this.buttonElement);
    this.buttonElement.appendChild(this.labelElement);
    this.buttonElement.setAttribute("tabindex", -1);

    this.buttonElement.addEventListener("contextmenu",
      event => event.preventDefault());

    this.buttonElement.addEventListener("focusin",
      event => container.onMenuItemFocused(this, event));

    this.buttonElement.addEventListener("click",
      event => container.onMenuItemClicked(this, event));
  }

  getLabel()
  {
    return this.label;
  }

  setLabel(label)
  {
    this.label = label;
    I18N.set(this.labelElement, "textContent", label || "menuitem");
  }
}

class MenuItem extends ActiveMenuItem
{
  constructor(container, action)
  {
    super(container, action.getLabel());
    this.action = action;
    this.buttonElement.setAttribute("role", "menuitem");
  }

  isEnabled()
  {
    return this.action.isEnabled();
  }

  setKeyShortcut(keyShortcut)
  {
    if (!this.keyElement)
    {
      this.keyElement = document.createElement("kbd");
      this.keyElement.className = "shortcut";
    }

    this.keyElement.textContent = keyShortcut;

    this.buttonElement.appendChild(this.keyElement);
    this.buttonElement.setAttribute("aria-keyshortcuts", keyShortcut);
  }

  removeKeyShortcut()
  {
    if (this.keyElement)
    {
      this.buttonElement.removeChild(this.keyElement);
      this.buttonElement.removeAttribute("aria-keyshortcuts");
      this.keyElement = null;
    }
  }
}

class Menu extends MenuItemList(ActiveMenuItem)
{
  constructor(container, label)
  {
    super(container, label);

    this.togglerElement = document.createElement("i");
    this.buttonElement.appendChild(this.togglerElement);
    this.buttonElement.setAttribute("aria-haspopup", "true");
    this.buttonElement.setAttribute("aria-expanded", "false");

    this.itemElement.appendChild(this.menuElement);
    this.itemElement.classList.add("menu");
  }

  isEnabled()
  {
    return true;
  }

  isExpanded()
  {
    return this.buttonElement.getAttribute("aria-expanded") === "true";
  }

  expand()
  {
    if (this.isExpanded()) return;

    this.itemElement.classList.add("drop");
    this.buttonElement.setAttribute("aria-expanded", "true");

    this.container.onMenuExpanded(this);

    let ancestor = this.parentMenu;
    while (ancestor && !ancestor.isExpanded())
    {
      ancestor.expand();
      ancestor = ancestor.parentMenu;
    }
  }

  collapse(recursive)
  {
    if (this.isExpanded())
    {
      this.itemElement.classList.remove("drop");
      this.buttonElement.setAttribute("aria-expanded", "false");
    }

    this.container.onMenuCollapsed(this);

    if (recursive)
    {
      for (let menuItem of this.menuItems)
      {
        if (menuItem instanceof Menu)
        {
          menuItem.collapse(recursive);
        }
      }
    }
  }

  toggle()
  {
    if (this.isExpanded())
    {
      this.collapse();
    }
    else
    {
      this.expand();
    }
  }

  addBackMenuItem()
  {
    this.backMenuItem = new BackMenuItem(this.container,
      this.buttonElement.textContent);
    this.putMenuItem(this.backMenuItem, 0);
    this.menuElement.classList.add("back");
    return this.backMenuItem;
  }

  removeBackMenuItem()
  {
    if (this.backMenuItem)
    {
      this.removeMenuItem(this.backMenuItem);
      this.backMenuItem = null;
      this.menuElement.classList.remove("back");
    }
  }
}

class BackMenuItem extends ActiveMenuItem
{
  constructor(container, label)
  {
    super(container, label);

    this.buttonElement.setAttribute("role", "menuitem");
    this.itemElement.classList.add("back");

    this.backElement = document.createElement("i");
    this.buttonElement.insertBefore(this.backElement, this.labelElement);
  }

  isEnabled()
  {
    return true;
  }
}

class Separator extends BaseMenuItem
{
  constructor(container, name = "")
  {
    super(container);
    this.name = name;
    this.itemElement.className = "separator";
  }
}

/**
 * Abstract MenuItemContainer.
 *
 * @class MenuItemContainer
 */
class MenuItemContainer extends MenuItemList()
{
  constructor(application)
  {
    super();
    this.application = application;
    this.container = this;
    this.focusedMenuItem = null; // current menuItem

    this.menuElement.addEventListener("pointermove", event =>
      this.onPointerMove(event), false);

    this.menuElement.addEventListener("keydown", event =>
      this.onKeyDown(event), false);

    this.menuElement.addEventListener("focusout", event =>
    {
      if (!this.menuElement.contains(event.relatedTarget))
      {
        setTimeout(() => this.hide(), 0);
      }
    });
  }

  onMenuItemFocused(menuItem, event)
  {
  }

  onMenuItemClicked(menuItem, event)
  {
  }

  onMenuItemAdded(menuItem)
  {
  }

  onMenuItemRemoved(menuItem)
  {
  }

  onMenuExpanded(menu)
  {
    let { overflowX, overflowY } = menu.getOverflow();

    if (overflowX > 0 || overflowY > 0)
    {
      if (overflowX > 0 && this.isVerticalMenu(menu))
      {
        // menuitems may overlap -> add back button
        let backMenuItem = menu.addBackMenuItem();
        let overflow = menu.getOverflow();
        overflowX = overflow.overflowX;
        overflowY = overflow.overflowY;
        backMenuItem.buttonElement.focus();
      }

      if (overflowX < 0) overflowX = 0;
      if (overflowY < 0) overflowY = 0;

      menu.menuElement.style.transform =
        "translate(-" + overflowX + "px,-" + overflowY + "px)";
    }
  }

  onMenuCollapsed(menu)
  {
    menu.menuElement.style.maxHeight = "";
    menu.menuElement.style.transform = "";
    menu.removeBackMenuItem();
  }

  onPointerMove(event)
  {
    let element = event.target;
    while (element && element.nodeName !== "BUTTON")
    {
      element = element.parentElement;
    }
    const activeElement = document.activeElement;
    if (element && element !== activeElement &&
        !element.parentElement.contains(activeElement))
    {
      element.focus();
    }
  }

  onKeyDown(event)
  {
    switch (event.key)
    {
      case "Escape":
        this.onEscape(event);
        break;
      case "ArrowDown":
        this.onArrowDown(event);
        break;
      case "ArrowUp":
        this.onArrowUp(event);
        break;
      case "ArrowRight":
        this.onArrowRight(event);
        break;
      case "ArrowLeft":
        this.onArrowLeft(event);
        break;
    }
  }

  onEscape(event)
  {
    this.hide();
  }

  onArrowDown(event)
  {
    event.preventDefault();
    let menuItem = this.focusedMenuItem;
    if (this.isVerticalMenu(menuItem))
    {
      this.focusSibling(menuItem, 1);
    }
    else
    {
      this.focusAncestor(menuItem, 1);
    }
  }

  onArrowUp(event)
  {
    event.preventDefault();
    let menuItem = this.focusedMenuItem;
    if (this.isVerticalMenu(menuItem))
    {
      this.focusSibling(menuItem, -1);
    }
    else
    {
      this.focusAncestor(menuItem, -1);
    }
  }

  onArrowRight(event)
  {
    event.preventDefault();
    let menuItem = this.focusedMenuItem;
    if (this.isVerticalMenu(menuItem))
    {
      this.focusAncestor(menuItem, 1);
    }
    else
    {
      this.focusSibling(menuItem, 1);
    }
  }

  onArrowLeft(event)
  {
    event.preventDefault();
    let menuItem = this.focusedMenuItem;
    if (this.isVerticalMenu(menuItem))
    {
      this.focusAncestor(menuItem, -1);
    }
    else
    {
      this.focusSibling(menuItem, -1);
    }
  }

  focusSibling(menuItem, direction)
  {
    menuItem = menuItem.getNextActiveMenuItem(direction);
    if (menuItem)
    {
      menuItem.buttonElement.focus();
    }
  }

  focusAncestor(menuItem, direction)
  {
    if (direction === -1)
    {
      menuItem = menuItem.parentMenu;
      if (menuItem && !this.isVerticalMenu(menuItem))
      {
        menuItem = menuItem.getNextActiveMenuItem(-1);
      }
    }
    else if (direction === 1)
    {
      if (menuItem instanceof Menu && menuItem.hasChildren())
      {
        menuItem.expand();
        menuItem = menuItem.menuItems[0].getNextActiveMenuItem(1, true);
      }
      else if (menuItem instanceof MenuItem)
      {
        while (menuItem.parentMenu)
        {
          menuItem = menuItem.parentMenu;
        }

        if (!this.isVerticalMenu(menuItem))
        {
          menuItem = menuItem.getNextActiveMenuItem(1);
        }
      }
    }

    if (menuItem)
    {
      menuItem.buttonElement.focus();
    }
  }

  focusMenuItem(menuItem)
  {
    this.focusedMenuItem = menuItem;
  }

  collapseFocusedMenuItem(nextMenuItem)
  {
    let menu = null;

    if (this.focusedMenuItem instanceof Menu)
    {
      menu = this.focusedMenuItem;
    }
    else if (this.focusedMenuItem)
    {
      menu = this.focusedMenuItem.parentMenu;
    }

    // get menuItem ancestors
    let ancestors = null;
    if (nextMenuItem && menu)
    {
      ancestors = new Set();
      ancestors.add(nextMenuItem);
      let ancestor = nextMenuItem.parentMenu;
      while (ancestor)
      {
        ancestors.add(ancestor);
        ancestor = ancestor.parentMenu;
      }
    }

    // hide parent menus not included in ancestors
    while (menu)
    {
      if (ancestors?.has(menu)) break;
      menu.collapse();
      menu = menu.parentMenu;
    }
  }

  collapseAllMenus()
  {
    for (let menuItem of this.menuItems)
    {
      if (menuItem instanceof Menu)
      {
        menuItem.collapse(true);
      }
    }
    this.focusedMenuItem = null;
  }

  hide()
  {
  }

  isVerticalMenu(menuItem)
  {
    return true;
  }
}

/**
 * A MenuBar that supports desktop and mobile modes.
 *
 * @extends MenuItemContainer
 */
class MenuBar extends MenuItemContainer
{
  constructor(application, element = document.body)
  {
    super(application);
    this.keyShortcuts = new Map();
    this.mode = this.getMode();
    this.armed = false;

    const menuBar = this;
    this.dropButtonElement = document.createElement("button");
    I18N.set(this.dropButtonElement, "textContent", "button.menu_show");
    this.dropButtonElement.className = "menu_button";
    this.dropButtonElement.setAttribute("aria-haspopup", "true");
    this.dropButtonElement.setAttribute("aria-expanded", "false");
    let ignore = false;
    this.dropButtonElement.addEventListener("pointerdown", event =>
    {
      ignore = menuBar.isVisible();
      // ignore button click because focusout event will hide the menubar
    });
    this.dropButtonElement.addEventListener("click", event =>
    {
      if (!ignore) menuBar.toggle();
      ignore = false;
    });
    element.appendChild(this.dropButtonElement);

    element.appendChild(this.menuElement);
    this.menuElement.className = "menubar";
    this.menuElement.setAttribute("role", "menubar");

    document.addEventListener("keydown", event =>
    {
      this.processShortcutKey(event);
    });

    window.addEventListener('resize', () => this.onResize(), false);
  }

  get menus()
  {
    return this.menuItems;
  }

  getMode()
  {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    return styles.getPropertyValue("--menubar-mode") || "horizontal";
  }

  isDesktopMode()
  {
    return this.mode === "desktop";
  }

  isMobileMode()
  {
    return this.mode === "mobile";
  }

  isVisible()
  {
    return this.menuElement.classList.contains("menu_drop");
  }

  show()
  {
    if (this.isMobileMode())
    {
      const menuElement = this.menuElement;
      menuElement.classList.add("menu_drop");
      menuElement.inert = false;
      menuElement.style.transition = "";
      this.dropButtonElement.setAttribute("aria-expanded", "true");
      I18N.set(this.dropButtonElement, "textContent", "button.menu_hide");
      this.application.i18n.update(this.dropButtonElement);
      let menuItem = this.menuItems[0].getNextActiveMenuItem(1, true);
      menuItem.buttonElement.focus();
      this.armed = true;
    }
  }

  hide()
  {
    const menuElement = this.menuElement;
    this.armed = false;
    if (this.isMobileMode())
    {
      menuElement.classList.remove("menu_drop");
      menuElement.inert = true;
      menuElement.style.transition = "";
      this.dropButtonElement.setAttribute("aria-expanded", "false");
      I18N.set(this.dropButtonElement, "textContent", "button.menu_show");
      this.application.i18n.update(this.dropButtonElement);
    }
    else // desktop mode
    {
      menuElement.inert = false;
      let menuItem = this.updadeTabindex();
      this.focusMenuItem(null);

      if (menuItem && menuElement.contains(document.activeElement))
      {
        this.focusedMenuItem = menuItem;
        this.focusedMenuItem.buttonElement.focus();
      }
    }
  }

  toggle()
  {
    if (this.isVisible())
    {
      this.hide();
    }
    else
    {
      this.show();
    }
  }

  isVerticalMenu(menuItem)
  {
    return this.isMobileMode() || menuItem.parentMenu;
  }

  updadeTabindex()
  {
    const menuItems = this.menuItems;
    if (menuItems.length === 0) return;

    for (let menuItem of menuItems)
    {
      if (menuItem instanceof ActiveMenuItem)
      {
        menuItem.buttonElement.setAttribute("tabindex", -1);
      }
    }

    let menuItem = this.focusedMenuItem;
    if (menuItem)
    {
      while (menuItem.parentMenu)
      {
        menuItem = menuItem.parentMenu;
      }
    }
    else
    {
      menuItem = menuItems[0];
    }
    menuItem.buttonElement.setAttribute("tabindex", 0);
    return menuItem;
  }

  addSeparator(name)
  {
    // do nothing, separators not supported in menuBar
  }

  onPointerMove(event)
  {
    if (this.armed)
    {
      if (this.isMobileMode())
      {
        let element = event.target;
        while (element && element.nodeName !== "BUTTON")
        {
          element = element.parentElement;
        }
        const activeElement = document.activeElement;
        if (element && element !== activeElement)
        {
          element.focus();
        }
      }
      else
      {
        super.onPointerMove(event);
      }
    }
  }

  onMenuItemFocused(menuItem, event)
  {
    this.focusMenuItem(menuItem);
    if (menuItem instanceof Menu && this.armed && this.isDesktopMode())
    {
      const menu = menuItem;
      if (menu.fitsInWindow())
      {
        menu.expand();
      }
      else
      {
        menu.collapse();
      }
    }
  }

  onMenuItemClicked(menuItem, event)
  {
    if (menuItem instanceof Menu)
    {
      const menu = menuItem;
      if (this.isMobileMode() || !this.isVerticalMenu(menu))
      {
        menu.toggle();
      }
      else
      {
        menu.expand();
      }
      this.armed = true;
    }
    else if (menuItem instanceof MenuItem)
    {
      menuItem.action.perform();
      if (this.isMobileMode())
      {
        this.hide();
      }
      else
      {
        this.focusMenuItem(null);
      }
    }
    else if (menuItem instanceof BackMenuItem)
    {
      menuItem.parentMenu.buttonElement.focus();
    }
  }

  onMenuItemAdded(menuItem)
  {
    if (menuItem instanceof MenuItem)
    {
      const action = menuItem.action;
      const keyShortcut = action.keyShortcut;
      if (keyShortcut)
      {
        menuItem.setKeyShortcut(keyShortcut);
        this.keyShortcuts.set(keyShortcut, action);
      }
    }
  }

  onMenuItemRemoved(menuItem)
  {
    if (menuItem instanceof MenuItem)
    {
      const action = menuItem.action;
      const keyShortcut = action.keyShortcut;
      if (keyShortcut)
      {
        menuItem.removeKeyShortcut();
        this.keyShortcuts.delete(keyShortcut);
      }
    }
  }

  onMenuExpanded(menu)
  {
    if (this.isDesktopMode())
    {
      super.onMenuExpanded(menu);
    }
    else
    {
      while (menu.parentMenu)
      {
        menu = menu.parentMenu;
      }
      this.updateMaxHeight(menu);
    }
  }

  onMenuCollapsed(menu)
  {
    if (this.isDesktopMode())
    {
      super.onMenuCollapsed(menu);
    }
    else
    {
      while (menu.parentMenu)
      {
        menu = menu.parentMenu;
      }
      this.updateMaxHeight(menu);
    }
  }

  focusAncestor(menuItem, direction)
  {
    super.focusAncestor(menuItem, direction);
    if (direction === 1)
    {
      this.armed = true;
    }
  }

  onEscape(event)
  {
    this.hide();
    this.dropButtonElement.focus();
  }

  onResize()
  {
    this.mode = this.getMode();
    this.collapseAllMenus();
    this.menuElement.style.transition = "opacity 0s";
    this.hide();
  }

  updateMaxHeight(menu)
  {
    let height = 0;

    if (menu.isExpanded())
    {
      const menuElement = menu.menuElement;

      let oldMaxHeight = menuElement.style.maxHeight;

      menuElement.style.transition = "none";
      menuElement.style.maxHeight = "none";

      height = menuElement.scrollHeight;

      menuElement.style.maxHeight = oldMaxHeight;
      menuElement.offsetHeight; // apply changes

      menuElement.style.transition = "";

      for (let menuItem of menu.menuItems)
      {
        if (menuItem instanceof Menu)
        {
          height += this.updateMaxHeight(menuItem);
        }
      }
    }
    menu.menuElement.style.maxHeight = height + "px";

    return height;
  }

  focusMenuItem(menuItem)
  {
    if (this.isDesktopMode())
    {
      this.collapseFocusedMenuItem(menuItem);

      if (menuItem)
      {
        menuItem.parentMenu?.expand();

        if (menuItem instanceof ActiveMenuItem)
        {
          menuItem.buttonElement.setAttribute("tabindex", -1);
        }
      }
    }
    this.focusedMenuItem = menuItem;
  }

  processShortcutKey(event)
  {
    if (event.target.nodeName === "INPUT" ||
        event.target.nodeName === "TEXTAREA") return;

    if (event.target.classList.contains("cm-content")) return;

    const textSelection = window.getSelection();
    if (textSelection && textSelection.toString().length > 0) return;

    let keys = [];
    if (event.altKey) keys.push("Alt");
    if (event.ctrlKey) keys.push("Control");
    if (event.shiftKey) keys.push("Shift");

    let key = event.key;
    if (key !== "Alt" && key !== "Control" && key !== "Shift")
    {
      if (key.length === 1) key = key.toUpperCase();
      keys.push(key);
    }

    let keyShortcut = keys.join("+");

    let action = this.keyShortcuts.get(keyShortcut);
    if (action)
    {
      event.preventDefault();
      action.perform();
    }
  }
}

/**
 * A ContextMenu that is activated by a contextmenu event.
 *
 * @extends MenuItemContainer
 */
class ContextMenu extends MenuItemContainer
{
  constructor(application)
  {
    super(application);

    this.menuElement.className = "contextmenu";
  }

  show(event)
  {
    const menuElement = this.menuElement;
    if (menuElement.parentElement)
    {
      this.hide();
    }

    let firstMenuItem = this.hideDisabledMenuItems(this.menuItems);

    this.application.i18n.updateTree(menuElement);

    if (firstMenuItem)
    {
      document.body.appendChild(menuElement);
      firstMenuItem.buttonElement.focus();

      const rect = this.getBounds();

      let x = event.pageX;
      let y = event.pageY;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const menuWidth = rect.width;
      const menuHeight = rect.height;
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
    if (document.body.contains(menuElement))
    {
      document.body.removeChild(menuElement);
    }
  }

  onMenuItemFocused(menuItem, event)
  {
    this.focusMenuItem(menuItem);
    if (menuItem instanceof Menu)
    {
      const menu = menuItem;
      if (menu.fitsInWindow(true, false))
      {
        menu.expand();
      }
      else
      {
        menu.collapse();
      }
    }
  }

  onMenuItemClicked(menuItem, event)
  {
    event.preventDefault();
    if (menuItem instanceof Menu)
    {
      const menu = menuItem;
      menu.expand();
    }
    else if (menuItem instanceof MenuItem)
    {
      menuItem.action.perform();
      this.hide();
    }
    else if (menuItem instanceof BackMenuItem)
    {
      menuItem.parentMenu.buttonElement.focus();
    }
  }

  hideDisabledMenuItems(menuItems)
  {
    let firstMenuItem = null;
    let lastMenuItem = null;

    for (let menuItem of menuItems)
    {
      let enabled = false;
      if (menuItem instanceof MenuItem)
      {
        let action = menuItem.action;
        enabled = action.isEnabled();
      }
      else if (menuItem instanceof Menu)
      {
        enabled = this.hideDisabledMenuItems(menuItem.menuItems) !== null;
      }
      else if (menuItem instanceof Separator)
      {
        enabled = lastMenuItem !== null && !(lastMenuItem instanceof Separator);
      }

      if (enabled)
      {
        menuItem.itemElement.style.display = "";
        if (!firstMenuItem) firstMenuItem = menuItem;
        lastMenuItem = menuItem;
      }
      else
      {
        menuItem.itemElement.style.display = "none";
      }
    }

    if (lastMenuItem instanceof Separator)
    {
      lastMenuItem.itemElement.style.display = "none";
    }

    return firstMenuItem;
  }

  focusMenuItem(menuItem)
  {
    this.collapseFocusedMenuItem(menuItem);

    if (menuItem)
    {
      menuItem.parentMenu?.expand();
    }
    this.focusedMenuItem = menuItem;
  }

  /**
   * @deprecated add actions to menuItems instead.
   */
  set actions(actions)
  {
    console.warn("ContextMenu.actions is deprecated. Add actions to menuItems instead.");
    const menuItems = this.menuItems;
    if (menuItems.length == 0)
    {
      for (let action of actions)
      {
        this.addMenuItem(action);
      }
    }
  }
}

export { MenuBar, ContextMenu, Menu, MenuItem, Separator };