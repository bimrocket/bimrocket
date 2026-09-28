/**
 * TabbedPane.js
 *
 * @author realor
 */

import { I18N } from "platform/i18n/I18N.js";

class TabbedPane
{
  static nextId = 0;

  constructor(parent)
  {
    this.id = TabbedPane.nextId++;

    this.paneElem = document.createElement("div");
    parent.appendChild(this.paneElem);
    this.paneElem.id = "tabbed-pane-" + this.id;
    this.paneElem.className = "tabbed-pane";
    this.paneElem.setAttribute("role", "tablist");

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
    const panelId = this._getTabPanelId(name);
    let tabPanelElem = this.headerElem.querySelector("#" + panelId);
    if (!tabPanelElem)
    {
      const tabId = this._getTabId(name);
      const tabElem = document.createElement("div");
      tabElem.tabIndex = "0";
      tabElem.id = tabId;
      tabElem.setAttribute("role", "tab");
      tabElem.setAttribute("aria-controls", panelId);
      tabElem.setAttribute("aria-selected", "false");
      tabElem.dataset.name = name;

      tabElem.addEventListener("click", (event) =>
      {
        event.preventDefault();
        this.showTab(name);
      });
      tabElem.addEventListener("keyup", (event) =>
      {
        if (event.keyCode === 13)
        {
          event.preventDefault();
          this.showTab(name);
        }
      });

      tabElem.addEventListener("contextmenu",
        event => event.preventDefault());

      if (label) I18N.set(tabElem, "textContent", label || name);
      if (title) I18N.set(tabElem, "title", title || name);
      if (className) tabElem.classList.add(className);

      this.headerElem.appendChild(tabElem);

      tabPanelElem = document.createElement("div");
      tabPanelElem.id = panelId;
      tabPanelElem.className = "tab-panel";
      tabPanelElem.setAttribute("role", "tabpanel");
      tabPanelElem.setAttribute("aria-labelledby", tabId);
      tabPanelElem.setAttribute("hidden", true);

      this.bodyElem.appendChild(tabPanelElem);

      if (this.headerElem.children.length === 1) // first tab
      {
        this._selectTab(tabElem);
      }
    }
    return tabPanelElem;
  }

  removeTab(name)
  {
    const tabId = this._getTabId(name);
    let tabElem = this.header.querySelector("#" + tabId);
    if (tabElem)
    {
      tabElem.remove();
    }

    const panelId = this._getTabPanelId(name);
    let tabPanelElem = this.bodyElem.querySelector("#" + panelId);
    tabPanelElem?.remove();

    if (this.headerElem.children.length > 0)
    {
      tabElem = this.headerElem.children[0];
      this._selectTab(tabElem);
    }
  }

  showTab(name)
  {
    let tabElem = this.headerElem.querySelector("[aria-selected=true]");
    this._unselectTab(tabElem);

    tabElem = this.headerElem.querySelector("[data-name=" + name + "]");
    this._selectTab(tabElem);
  }

  getVisibleTabName()
  {
    let tabElem = this.headerElem.querySelector("[aria-selected=true]");
    return tabElem ? tabElem.dataset.name : null;
  }

  getTab(name)
  {
    const tabId = this._getTabId(name);
    return this.headerElem.querySelector("#" + tabId);
  }

  getTabPanel(name)
  {
    const panelId = this._getTabPanelId(name);
    return this.bodyElem.querySelector("#" + panelId);
  }

  setLabel(name, label)
  {
    let tabElem = this.getTab(name);
    if (tabElem)
    {
      I18N.set(tabElem, "textContent", label);
    }
  }

  getLabel(name)
  {
    let tabElem = this.getTab(name);
    if (tabElem)
    {
      return tabElem.textContent;
    }
    return null;
  }

  _selectTab(tabElem)
  {
    if (!tabElem) return;

    tabElem.setAttribute("aria-selected", "true");
    let name = tabElem.dataset.name;
    let tabPanel = this.getTabPanel(name);
    tabPanel?.removeAttribute("hidden");
  }

  _unselectTab(tabElem)
  {
    if (!tabElem) return;

    tabElem.setAttribute("aria-selected", "false");
    let name = tabElem.dataset.name;
    let tabPanel = this.getTabPanel(name);
    tabPanel?.setAttribute("hidden", "true");
  }

  _getTabId(name)
  {
    return "tab-" + this.id + "-" + name;
  }

  _getTabPanelId(name)
  {
    return "tab-panel-" + this.id + "-" + name;
  }
}

export { TabbedPane };