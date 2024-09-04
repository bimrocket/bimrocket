/**
 * TabbedPane.js
 *
 * @author realor
 */

import { I18N } from "../i18n/I18N.js";

class TabbedPane
{
  constructor(element)
  {
    this.tabs = new Map();
    this.visibleTabName = null;

    this.paneElem = document.createElement("div");
    element.appendChild(this.paneElem);
    this.paneElem.className = "tabbed_pane";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";
    this.paneElem.appendChild(this.headerElem);

    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.paneElem.appendChild(this.bodyElem);
  }

  addClassName(className)
  {
    this.paneElem.classList.add(className);
  }

  addTab(name, label, title, className)
  {
    if (!this.tabs.has(name))
    {
      const tabSelectorElem = document.createElement("a");
      tabSelectorElem.href = "#";
      tabSelectorElem.addEventListener("click", () => this.showTab(name));
      tabSelectorElem.addEventListener("contextmenu",
        event => event.preventDefault());
      tabSelectorElem.className = "selector";
      if (label) I18N.set(tabSelectorElem, "textContent", label || name);
      if (title) I18N.set(tabSelectorElem, "title", title || name);
      if (className) tabSelectorElem.classList.add(className);

      this.headerElem.appendChild(tabSelectorElem);

      const tabPanelElem = document.createElement("div");
      this.bodyElem.appendChild(tabPanelElem);
      tabPanelElem.className = "tab_panel";

      const tabElems = {
        "selector" : tabSelectorElem,
        "panel" : tabPanelElem
      };
      this.tabs.set(name, tabElems);
      if (this.tabs.size === 1) // first tab
      {
        this.selectTab(tabElems);
        this.visibleTabName = name;
      }
      return tabElems.panel;
    }
    return null;
  }

  removeTab(name)
  {
    let tabElems = this.tabs.get(name);
    if (tabElems)
    {
      this.headerElem.removeChild(tabElems.selector);
      this.bodyElem.removeChild(tabElems.panel);
      this.tabs.delete(name);
      if (this.tabs.size > 0) // not empty
      {
        this.visibleTabName = this.tabs.keys().next().value;
        tabElems = this.tabs.values().next().value;
        this.selectTab(tabElems);
      }
      else
      {
        this.visibleTabName = null;
      }
    }
  }

  showTab(name)
  {
    let tabElems;

    for (tabElems of this.tabs.values())
    {
      this.unselectTab(tabElems);
    }

    tabElems = this.tabs.get(name);
    if (tabElems)
    {
      this.selectTab(tabElems);
    }
    this.visibleTabName = name;
  }

  getVisibleTabName()
  {
    return this.visibleTabName;
  }

  getTab(name)
  {
    return this.tabs.get(name);
  }

  setLabel(name, label)
  {
    let tabElems = this.tabs.get(name);
    if (tabElems)
    {
      tabElems.selector.textContent = label;
    }
  }

  getLabel(name)
  {
    let tabElems = this.tabs.get(name);
    if (tabElems)
    {
      return tabElems.selector.innerHTML;
    }
    return null;
  }

  selectTab(tabElems)
  {
    tabElems.selector.classList.add("selected");
    tabElems.panel.classList.add("selected");
  }

  unselectTab(tabElems)
  {
    tabElems.selector.classList.remove("selected");
    tabElems.panel.classList.remove("selected");
  }
}

export { TabbedPane };