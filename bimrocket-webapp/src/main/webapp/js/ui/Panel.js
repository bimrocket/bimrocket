/**
 * Panel.js
 *
 * @author realor
 */

import { I18N } from "../i18n/I18N.js";

class Panel
{
  static POSITIONS = ["left", "right", "bottom"];
  static HEADER_HEIGHT = 24;
  static MARGIN = 6;

  constructor(application)
  {
    this.application = application;
    this.panelManager = null;
    this.preferredHeight = 0; // 0: all available space, > 0: height in pixels

    this.element = document.createElement("div");
    this.element.className = "panel";
    this.element.style.margin = Panel.MARGIN + "px";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";
    this.element.appendChild(this.headerElem);

    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.element.appendChild(this.bodyElem);

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

    this.titleElem = document.createElement("a");
    this.titleElem.className = "title";
    this.titleElem.href = "#";
    this.headerElem.appendChild(this.titleElem);

    this.closeButtonElem = document.createElement("button");
    this.closeButtonElem.className = "close";
    I18N.set(this.closeButtonElem, "aria-label", "button.close");
    I18N.set(this.closeButtonElem, "alt", "button.close");
    I18N.set(this.closeButtonElem, "title", "button.close");
    this.headerElem.appendChild(this.closeButtonElem);

    this.titleElem.addEventListener("click", event =>
      { event.preventDefault(); this.zoom(); }, false);

    this.minimizeButtonElem.addEventListener("click", event =>
      this.minimized = true, false);

    this.maximizeButtonElem.addEventListener("click", event =>
      this.minimized = false, false);

    this.closeButtonElem.addEventListener("click", event =>
      this.visible = false, false);

    this._position = null;
    this.position = "left";
    this.opacity = application.panelOpacity;
  }

  get title()
  {
    return this.titleElem.innerHTML;
  }

  set title(title)
  {
    this.titleElem.innerHTML = title;
    I18N.set(this.titleElem, "innerHTML", title);
  }

  get position()
  {
    return this._position;
  }

  set position(position)
  {
    if (position !== this._position)
    {
      var element = this.element;
      if (this._position)
      {
        element.classList.remove(this._position);
      }
      this._position = position;
      element.classList.add(position);
      if (this.panelManager) this.panelManager.updateLayout();
    }
  }

  get visible()
  {
    return this.element.classList.contains("show");
  }

  set visible(visible)
  {
    if (this.panelManager) this.panelManager.setAnimationEnabled(false);

    let prevVisible = this.visible;
    if (visible && !prevVisible)
    {
      this.element.classList.add("show");
      if (this.panelManager) this.panelManager.updateLayout();
      this.onShow();
    }
    else if (!visible && prevVisible)
    {
      this.element.classList.remove("show");
      if (this.panelManager) this.panelManager.updateLayout();
      this.onHide();
    }
  }

  get minimized()
  {
    return this.element.classList.contains("minimized");
  }

  set minimized(minimized)
  {
    if (this.panelManager) this.panelManager.setAnimationEnabled(true);

    let prevMinimized = this.minimized;
    if (minimized && !prevMinimized)
    {
      this.element.classList.add("minimized");
      if (this.panelManager) this.panelManager.updateLayout();
      this.onMinimize();
    }
    else if (!minimized && prevMinimized)
    {
      this.element.classList.remove("minimized");
      if (this.panelManager) this.panelManager.updateLayout();
      this.onMaximize();
    }
  }

  setTitle(title)
  {
    this.title = title;
    return this;
  }

  setPosition(position)
  {
    this.position = position;
    return this;
  }

  setClassName(className)
  {
    this.element.classList.add(className);
    return this;
  }

  zoom()
  {
    if (this.panelManager)
    {
      let position = this.panelManager.isLargeScreen() ? this.position : null;
      let panels = this.panelManager.getPanels(position, true);
      for (let panel of panels)
      {
        if (panel !== this)
        {
          panel.element.classList.add("minimized");
        }
      }
      this.element.classList.remove("minimized");
      this.panelManager.setAnimationEnabled(true);
      this.panelManager.updateLayout();
    }
  }

  get opacity()
  {
    return this._opacity;
  }

  set opacity(opacity)
  {
    this._opacity = opacity;
    this.element.style.background = "rgba(255,255,255," + opacity + ")";

    let headerOpacity = Math.min(opacity + 0.2, 1);
    this.headerElem.style.background =
      "rgba(255,255,255," + headerOpacity + ")";
  }

  onShow()
  {
  }

  onHide()
  {
  }

  onMinimize()
  {
  }

  onMaximize()
  {
  }
}

class PanelManager
{
  constructor(container)
  {
    this.container = container || document.body;
    this.margin = 0;
    this.headerHeight = Panel.HEADER_HEIGHT;
    this.panels = [];

    this.resizers = {};
    this.resizers.left = new PanelResizer(this, "left");
    this.resizers.right = new PanelResizer(this, "right");

    window.addEventListener('resize', event =>
    {
      this.setAnimationEnabled(false);
      this.updateLayout();
    }, false);
  }

  addPanel(panel)
  {
    let index = this.panels.indexOf(panel);
    if (index === -1)
    {
      panel.panelManager = this;
      this.panels.push(panel);
      this.container.appendChild(panel.element);
    }
  }

  removePanel(panel)
  {
    let index = this.panels.indexOf(panel);
    if (index !== -1)
    {
      panel.panelManager = null;
      this.panels.splice(index, 1);
      this.container.removeChild(panel.element);
    }
  }

  getPanels(position = null, visible = null)
  {
    let selection = [];
    for (let i = 0; i < this.panels.length; i++)
    {
      let panel = this.panels[i];
      if (position === null || panel.position === position)
      {
        if (visible === null || panel.visible === visible)
        {
          selection.push(panel);
        }
      }
    }
    return selection;
  }

  isAnimationEnabled()
  {
    return this.container.classList.contains("animate");
  }

  setAnimationEnabled(enabled)
  {
    if (enabled)
    {
      this.container.classList.add("animate");
    }
    else
    {
      this.container.classList.remove("animate");
    }
  }

  updateLayout()
  {
    const container = this.container;
    const height = container.clientHeight - Panel.MARGIN - 1;
    if (this.isLargeScreen())
    {
      this.resizers.left.enabled = true;
      this.resizers.right.enabled = true;

      let positions = Panel.POSITIONS;
      for (var i = 0; i < positions.length; i++)
      {
        let position = positions[i];
        let panels = this.getPanels(position, true);
        let maxHeight = this.layoutElements(panels, height);
        let resizer = this.resizers[position];
        if (resizer)
        {
          resizer.height = maxHeight;
          resizer.updateBar();
          resizer.saveWidth();
        }
      }
    }
    else
    {
      this.resizers.left.enabled = false;
      this.resizers.right.enabled = false;

      let panels = this.getPanels(null, true);
      this.layoutElements(panels, Math.floor(height / 2));
    }
  }

  layoutElements(panels, height)
  {
    let extendedPanelsCount = 0;
    let fixedHeight = 0;
    let total = panels.length;
    for (let i = 0; i < total; i++)
    {
      let panel = panels[i];
      if (panel.minimized)
      {
        fixedHeight += this.headerHeight;
      }
      else
      {
        if (panel.preferredHeight === 0)
        {
          extendedPanelsCount++;
        }
        else
        {
          fixedHeight += panel.preferredHeight;
        }
      }
      fixedHeight += Panel.MARGIN;
    }

    let availableHeight = height - fixedHeight;
    let i = 0;
    while (availableHeight < 0 && i < total)
    {
      let j = total - i - 1;
      let panel = panels[j];
      if (!panel.minimized && panel.preferredHeight > 0)
      {
        panel.element.classList.add("minimized");
        availableHeight += (panel.preferredHeight - this.headerHeight);
      }
      i++;
    }
    let extendedPanelHeight = Math.floor(availableHeight / extendedPanelsCount);
    let bottom = this.margin;
    for (let i = 0; i < total; i++)
    {
      let j = total - i - 1;
      let panel = panels[j];
      panel.element.style.bottom = bottom + "px";
      if (this.isLargeScreen())
      {
        let resizer = this.resizers[panel.position];
        if (resizer)
        {
          panel.element.style.width =
            (resizer.width - Panel.MARGIN) + "px";
        }
      }
      else
      {
        panel.element.style.width = "";
      }
      let currentPanelHeight;
      if (panel.minimized)
      {
        currentPanelHeight = this.headerHeight;
      }
      else if (panel.preferredHeight === 0)
      {
        currentPanelHeight = extendedPanelHeight;
      }
      else
      {
        currentPanelHeight = panel.preferredHeight;
      }
      panel.element.style.height = currentPanelHeight + "px";
      bottom += currentPanelHeight + Panel.MARGIN;
    }
    return bottom;
  }

  isLargeScreen()
  {
    return this.container.clientWidth > 768;
  }
};

class PanelResizer
{
  constructor(panelManager, side)
  {
    this.panelManager = panelManager;
    this.side = side;
    this.height = 0;
    this.width = 0;

    this.element = document.createElement("div");
    const element = this.element;
    const container = panelManager.container;

    element.className = "resizer";
    container.appendChild(element);

    this.restoreWidth();
    this.updateBar();

    const move = event =>
    {
      this.width = this.getCurrentWidth(event);
      this.updateBar();
      this.panelManager.updateLayout();
    };

    const reset = event =>
    {
      element.removeEventListener("pointermove", move, false);
      element.removeEventListener("pointerup", reset, false);
      element.releasePointerCapture(event.pointerId);
    };

    element.addEventListener("pointerdown", event =>
    {
      element.addEventListener("pointermove", move, false);
      element.addEventListener("pointerup", reset, false);
      element.setPointerCapture(event.pointerId);
    });
  }

  updateBar()
  {
    this.element.style.height = this.height + "px";
    this.element.style[this.side] = this.width + "px";
  }

  get enabled()
  {
    return this.element.style.display === "";
  }

  set enabled(enabled)
  {
    this.element.style.display = enabled ? "" : "none";
  }

  restoreWidth()
  {
    let value = window.localStorage.getItem("bimrocket.resizer." + this.side);
    this.width = parseInt(value) || 250;
  }

  saveWidth()
  {
    window.localStorage.setItem("bimrocket.resizer." + this.side, this.width);
  }

  getCurrentWidth(event)
  {
    const rect = this.panelManager.container.getBoundingClientRect();
    let curWidth = 0;
    if (this.side === "left")
    {
      curWidth = event.clientX - rect.left;
    }
    else if (this.side === "right")
    {
      curWidth = rect.left + rect.width - event.clientX;
    }
    return curWidth;
  }
}

export { Panel, PanelManager };