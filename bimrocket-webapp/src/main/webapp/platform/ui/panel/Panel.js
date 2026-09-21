/**
 * Panel.js
 *
 * @author realor
 */

import { Controls } from "platform/ui/Controls.js";
import { I18N } from "platform/i18n/I18N.js";

class Panel
{
  static MOBILE_WIDTH = 768;
  static POSITIONS = ["left", "right", "center"];
  static DEFAULT_WIDTH = 300;
  static DEFAULT_HEIGHT = 200;
  static DEFAULT_MOBILE_HEIGHT = 100;
  static MIN_WIDTH = 100;
  static MIN_HEIGHT = 50;

  constructor(application)
  {
    this.application = application;
    this.panelManager = null;

    this.id = null; // required to save the panel height
    this.defaultHeight = Panel.DEFAULT_HEIGHT;
    this.defaultMobileHeight = Panel.DEFAULT_MOBILE_HEIGHT;
    this.minimumHeight = Panel.MIN_HEIGHT; // must be less than defaultHeight
    this.priority = 0; // panels are ordered by priority
    this.tool = null; // the tool that activated this panel

    this._activation = 0; // last activation millis
    this._resizing = false; // indicates if the panel is being resized
    this._height = -1; // the desired panel height for large screens
    this._mobileHeight = -1; // the desired panel height for small screens
    this._actualHeight = 0; // the actual height
    this._minimized = false;
    this._position = "left";

    this.element = document.createElement("div");
    this.element.className = "panel";

    const resizerElem = document.createElement("div");
    resizerElem.className = "v-resizer";
    this.element.appendChild(resizerElem);

    const moverElem = document.createElement("div");
    moverElem.className = "mover";
    this.element.appendChild(moverElem);

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

    Controls.addIcon(this.minimizeButtonElem, "minimize", "mini");

    const titleElem = document.createElement("div");
    this.titleElem = titleElem;
    titleElem.className = "title";
    this.headerElem.appendChild(titleElem);

    this.iconElem = Controls.addIcon(titleElem, null, "icon-20");

    this.titleLinkElem = document.createElement("span");
    this.titleElem.appendChild(this.titleLinkElem);

    this.closeButtonElem = document.createElement("button");
    this.closeButtonElem.className = "close";
    I18N.set(this.closeButtonElem, "aria-label", "button.close");
    I18N.set(this.closeButtonElem, "alt", "button.close");
    I18N.set(this.closeButtonElem, "title", "button.close");
    this.headerElem.appendChild(this.closeButtonElem);

    Controls.addIcon(this.closeButtonElem, "close", "mini");

    this.minimizeButtonElem.addEventListener("click", () =>
      this.minimized = true);

    this.closeButtonElem.addEventListener("click", () =>
    {
      if (this.onClose())
      {
        this.visible = false;
      }
    });

    let positionY = 0;
    let offsetY = 0;

    const moveVertical = event =>
    {
      const panelManager = this.panelManager;

      let columnTop = panelManager.top;

      let y = event.clientY;

      if (y < columnTop + offsetY) y = columnTop + offsetY;

      const delta = positionY - y;

      this.height += delta;
      if (this.height < this.minimumHeight)
      {
        this.height = this.minimumHeight;
      }
      positionY = y;
      panelManager.updateLayout();
    };

    const endVertical = event =>
    {
      this.saveHeight();
      this._resizing = false;

      resizerElem.removeEventListener("pointermove", moveVertical, false);
      resizerElem.removeEventListener("pointerup", endVertical, false);
      resizerElem.releasePointerCapture(event.pointerId);
    };

    resizerElem.addEventListener("pointerdown", event =>
    {
      this._activation = Date.now();
      this.height = this.element.clientHeight;
      this._resizing = true;

      positionY = event.clientY;
      offsetY = Math.round(event.clientY - this.element.getBoundingClientRect().top);

      resizerElem.addEventListener("pointermove", moveVertical, false);
      resizerElem.addEventListener("pointerup", endVertical, false);
      resizerElem.setPointerCapture(event.pointerId);
    });

    const moveHorizontal = event =>
    {
      const panelManager = this.panelManager;

      if (event.clientX < panelManager.getLeft())
      {
        this.position = "left";
      }
      else if (event.clientX < panelManager.container.clientWidth - panelManager.getRight())
      {
        this.position = "center";
      }
      else
      {
        this.position = "right";
      }
    };

    const endHorizontal = event =>
    {
      this.element.classList.remove("move");

      moverElem.removeEventListener("pointermove", moveHorizontal, false);
      moverElem.removeEventListener("pointerup", endHorizontal, false);
      moverElem.releasePointerCapture(event.pointerId);
    };

    moverElem.addEventListener("pointerdown", event =>
    {
      this.element.classList.add("move");

      moverElem.addEventListener("pointermove", moveHorizontal, false);
      moverElem.addEventListener("pointerup", endHorizontal, false);
      moverElem.setPointerCapture(event.pointerId);
    });

    this.opacity = application.setup.panelOpacity;
    this.position = "left";
  }

  setId(id)
  {
    this.id = id;
    return this;
  }

  setDefaultHeight(height)
  {
    this.defaultHeight = height;
    return this;
  }

  setDefaultMobileHeight(height)
  {
    this.defaultMobileHeight = height;
    return this;
  }

  setMinimumHeight(height)
  {
    this.minimumHeight = height;
    return this;
  }

  setPriority(priority)
  {
    this.priority = priority;
    return this;
  }

  setTool(tool)
  {
    this.tool = tool;
    return this;
  }

  setTitle(title)
  {
    this.title = title;
    return this;
  }

  setIconName(iconName)
  {
    this.iconName = iconName;
    return this;
  }

  setCloseable(closeable)
  {
    this.closeable = closeable;
    return this;
  }

  setHeight(height)
  {
    this.height = height;
    return this;
  }

  setPosition(position)
  {
    this.position = position;
    return this;
  }

  setActivated(activated)
  {
    this.activated = activated;
    return this;
  }

  setVisible(visible)
  {
    this.visible = visible;
    return this;
  }

  setMinimized(minimized)
  {
    this.minimized = minimized;
    return this;
  }

  setClassName(className)
  {
    this.element.classList.add(className);
    return this;
  }

  setOpacity(opacity)
  {
    this.opacity = opacity;
    return this;
  }

  get title()
  {
    return this.titleLinkElem.innerHTML;
  }

  set title(title)
  {
    this.titleLinkElem.textContent = title;
    I18N.set(this.titleLinkElem, "textContent", title);
    this.application.i18n.update(this.titleLinkElem);
  }

  get iconName()
  {
    return this.iconElem.dataset.icon;
  }

  set iconName(iconName)
  {
    Controls.setIcon(this.iconElem, iconName);
  }

  get closeable()
  {
    return this.closeButtonElem.style.display !== "none";
  }

  set closeable(closeable)
  {
    this.closeButtonElem.style.display = closeable ? "" : "none";
  }

  get height()
  {
    return this.panelManager?.isMobileScreen ?
      this._mobileHeight : this._height;
  }

  set height(height)
  {
    if (this.panelManager?.isMobileScreen)
    {
      this._mobileHeight = height;
    }
    else
    {
      this._height = height;
    }
  }

  get position()
  {
    return this._position;
  }

  set position(position)
  {
    if (position !== this._position)
    {
      this._position = position;
      this.panelManager?.updateLayout();
    }
  }

  get collapsed()
  {
    return this.element.classList.contains("collapsed");
  }

  get activated()
  {
    return this.element.classList.contains("activated");
  }

  set activated(activated)
  {
    const oldVisible = this.visible;

    if (activated && !this.activated)
    {
      this._activation = Date.now();
      this.element.classList.add("activated");
      this.panelManager?.updateLayout();
      this.panelManager?.notifyChange("activate", this);
      this.onActivate();
    }
    else if (!activated && this.activated)
    {
      this.element.classList.remove("activated");
      this.panelManager?.updateLayout();
      this.panelManager?.notifyChange("deactivate", this);
      this.onDeactivate();
    }

    let visible = this.visible;
    if (visible && !oldVisible) this.onShow();
    else if (!visible && oldVisible) this.onHide();
  }

  get visible()
  {
    return this.activated && !this.collapsed;
  }

  set visible(visible)
  {
    const oldVisible = this.visible;

    if (visible && !this.visible)
    {
      this._activation = Date.now();
      this._minimized = false;
      this.element.classList.add("activated");
      this.panelManager?.updateLayout();
      this.panelManager?.notifyChange("activate", this);
    }
    else if (!visible)
    {
      this.element.classList.remove("activated");
      this.panelManager?.updateLayout();
      this.panelManager?.notifyChange("deactivate", this);
    }

    if (visible && !oldVisible) this.onShow();
    else if (!visible && oldVisible) this.onHide();
  }

  get minimized()
  {
    return this._minimized;
  }

  set minimized(minimized)
  {
    const oldVisible = this.visible;

    if (minimized !== this._minimized)
    {
      this.activated = Date.now();
      this._minimized = minimized;
      this.panelManager?.updateLayout();
      this.panelManager?.notifyChange(minimized ? "minimize" : "restore", this);
    }

    let visible = this.visible;
    if (visible && !oldVisible) this.onShow();
    else if (!visible && oldVisible) this.onHide();
  }

  get opacity()
  {
    return this._opacity;
  }

  set opacity(opacity)
  {
    this._opacity = opacity;

    if (opacity < 1)
    {
      const percentage = Math.round(100 * opacity);
      this.element.style.background =
        "color-mix(in srgb, var(--panel-background) " + percentage  +
        "%, transparent)";
    }
    else
    {
      this.element.style.background = "var(--panel-background)";
    }
  }

  show()
  {
    this.visible = true;
    return this;
  }

  hide()
  {
    this.visible = false;
    return this;
  }

  restoreHeight()
  {
    const panelManager = this.panelManager;
    const isMobileScreen = panelManager.isMobileScreen;

    if (this.id)
    {
      const setup = panelManager.application.setup;

      if (isMobileScreen)
      {
        let value = setup.getItem("panel." + this.id + ".mobileHeight");
        this._mobileHeight = value === null ?
          this.defaultMobileHeight : parseInt(value);
        this._mobileHeight = Math.max(this._mobileHeight, this.minimumHeight);
      }
      else
      {
        let value = setup.getItem("panel." + this.id + ".height");
        this._height = value === null ? this.defaultHeight : parseInt(value);
        this._height = Math.max(this._height, this.minimumHeight);
      }
    }
    else
    {
      if (isMobileScreen)
      {
        this._mobileHeight = this.defaultMobileHeight;
      }
      else
      {
        this._height = this.defaultHeight;
      }
    }
  }

  saveHeight()
  {
    if (this.id)
    {
      const panelManager = this.panelManager;
      const isMobileScreen = panelManager.isMobileScreen;
      const setup = panelManager.application.setup;

      if (isMobileScreen)
      {
        setup.setItem("panel." + this.id + ".mobileHeight",
          Math.round(this._mobileHeight));
      }
      else
      {
        setup.setItem("panel." + this.id + ".height", Math.round(this._height));
      }
    }
  }

  onClose()
  {
    return true;
  }

  onActivate()
  {
  }

  onDeactivate()
  {
  }

  onShow()
  {
  }

  onHide()
  {
  }
}

class PanelManager
{
  constructor(application)
  {
    this.application = application;
    this.container = application.container || document.body;
    this.margin = -1;
    this.top = 0;
    this.bottom = 0;
    this.panels = []; // all panels
    this.panelMap = new Map(); // panels with id
    this.panelCount = {};
    this.resizers = {};
    this.resizers.left = new HorizontalResizer(this, "left");
    this.resizers.right = new HorizontalResizer(this, "right");
    this.listeners = [];

    this.isMobileScreen = false;

    window.addEventListener("resize", event =>
    {
      this.setAnimationEnabled(false);
      this.updateLayout();
    }, false);

    this.leftButton = document.createElement("button");
    this.leftButton.className = "panel-expander left hidden";
    this.container.appendChild(this.leftButton);
    Controls.addIcon(this.leftButton, "chevron-right", "icon");
    this.leftButton.addEventListener("click", event =>
    {
      event.preventDefault();
      this.resizers.left.width = Panel.DEFAULT_WIDTH;
      this.resizers.right.fixCollision();
      this.resizers.left.saveWidth();
      this.resizers.right.saveWidth();
    });

    this.rightButton = document.createElement("button");
    this.rightButton.className = "panel-expander right hidden";
    this.container.appendChild(this.rightButton);
    Controls.addIcon(this.rightButton, "chevron-left", "icon");
    this.rightButton.addEventListener("click", event =>
    {
      event.preventDefault();
      this.resizers.right.width = Panel.DEFAULT_WIDTH;
      this.resizers.left.fixCollision();
      this.resizers.left.saveWidth();
      this.resizers.right.saveWidth();
    });
  }

  addPanel(panel)
  {
    let index = this.panels.indexOf(panel);
    if (index === -1)
    {
      panel.panelManager = this;
      this.panels.push(panel);
      this.container.appendChild(panel.element);
      if (panel.id)
      {
        this.panelMap.set(panel.id, panel);
      }
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
      if (panel.id)
      {
        this.panelMap.delete(panel.id);
      }
    }
  }

  getPanel(id)
  {
    return this.panelMap.get(id);
  }

  addEventListener(listener)
  {
    let listeners = this.listeners;
    if (listeners)
    {
      listeners.push(listener);
    }
  }

  removeEventListener(listener)
  {
    let listeners = this.listeners;
    if (listeners)
    {
      let index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }
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

  getPanels(position = null, activated = null)
  {
    const selection = [];

    for (let panel of this.panels)
    {
      let height = panel.height;
      if (height < 0)
      {
        panel.restoreHeight();
      }

      if (position === null || panel.position === position)
      {
        if (activated === null || panel.activated === activated)
        {
          if (panel.minimized)
          {
            panel.element.classList.add("collapsed");
          }
          else
          {
            selection.push(panel);
          }
        }
      }
    }
    return selection;
  }

  updateLayout()
  {
    const container = this.container;
    const containerWidth = container.clientWidth;
    this.top = this.getTop();
    this.bottom = this.getBottom();
    const containerHeight = container.clientHeight - this.top - this.bottom;

    this.isMobileScreen = container.clientWidth < Panel.MOBILE_WIDTH;
    this.margin = this.getMargin();

    if (this.isMobileScreen)
    {
      this.resizers.left.enabled = false;
      this.resizers.right.enabled = false;

      let panels = this.getPanels(null, true);
      this.layoutElements(panels, null, containerHeight);
    }
    else
    {
      this.resizers.left.enabled = true;
      this.resizers.right.enabled = true;

      let positions = Panel.POSITIONS;
      for (let position of positions)
      {
        let panels = this.getPanels(position, true);
        this.panelCount[position] = panels.length;

        let maxBottom = this.layoutElements(panels, position, containerHeight);

        let resizer = this.resizers[position];
        if (resizer)
        {
          resizer.height = maxBottom - this.bottom;
          resizer.updateBar();
        }
      }
    }
  }

  layoutElements(panels, position, height)
  {
    let bottom = this.bottom; // set initial bottom to toolbar height
    let margin = this.margin;
    let container = this.container;
    let leftWidth = this.resizers.left.width;
    let rightWidth = this.resizers.right.width;

    if (panels.length === 0) return bottom;

    if (leftWidth < Panel.MIN_WIDTH + margin)
    {
      leftWidth = 0;
      this.leftButton.classList.remove("hidden");
    }
    else
    {
      this.leftButton.classList.add("hidden");
    }

    if (rightWidth < Panel.MIN_WIDTH + margin)
    {
      rightWidth = 0;
      this.rightButton.classList.remove("hidden");
    }
    else
    {
      this.rightButton.classList.add("hidden");
    }

    let remainingHeight = height;

    const prefPanel = panels.reduce((maxPanel, panel) =>
      panel._activation > maxPanel._activation ? panel : maxPanel);

    // ensure minimumHeight to preference panel
    if (prefPanel.minimumHeight < remainingHeight)
    {
      prefPanel._actualHeight = prefPanel.minimumHeight;
      remainingHeight -= (prefPanel.minimumHeight + this.margin);
    }
    else
    {
      prefPanel._actualHeight = remainingHeight;
      remainingHeight = 0;
    }

    // sort panels by priority ascending
    panels.sort((p1, p2) =>
    {
      let dif = p1.priority - p2.priority;
      return dif === 0 ? p1.title.localeCompare(p2.title) : dif;
    });

    // give minimal height to panels when possible
    for (let panel of panels)
    {
      if (panel === prefPanel) continue;

      if (panel.minimumHeight < remainingHeight)
      {
        panel._actualHeight = panel.minimumHeight;
        remainingHeight -= (panel.minimumHeight + this.margin);
      }
      else
      {
        panel._actualHeight = 0;
      }
    }

    if (remainingHeight > 0)
    {
      // distribute the excess height between the visible panels
      for (let panel of panels)
      {
        if (panel._actualHeight === 0) continue;

        let extra = panel.height - panel.minimumHeight;

        if (extra < remainingHeight)
        {
          panel._actualHeight += extra;
          remainingHeight -= extra;
        }
        else
        {
          panel._actualHeight += remainingHeight;
          remainingHeight = 0;
          break;
        }
      }
    }

    for (let panel of panels)
    {
      let panelHeight = panel._actualHeight;

      // set panel bottom
      panel.element.style.bottom = bottom + "px";

      // set panel margin
      panel.element.style.margin = margin + "px";

      let panelWidth;
      // place panel depending on position
      if (position === "left")
      {
        panelWidth = leftWidth - margin;
        panel.element.style.left = "0";
        panel.element.style.right = "";
        panel.element.style.width = panelWidth + "px";
      }
      else if (position === "right")
      {
        panelWidth = rightWidth - margin;
        panel.element.style.left = "";
        panel.element.style.right = "0";
        panel.element.style.width = panelWidth + "px";
      }
      else if (position === "center")
      {
        if (this.panelCount["left"] === 0) leftWidth = 0;
        if (this.panelCount["right"] === 0) rightWidth = 0;

        panel.element.style.left = leftWidth + "px";
        panel.element.style.right = rightWidth + "px";
        panel.element.style.width = "";
        panelWidth = container.clientWidth - leftWidth - rightWidth;
      }
      else // mobile
      {
        panel.element.style.left = "0";
        panel.element.style.right = "0";
        panel.element.style.width = "";
        panelWidth = container.clientWidth;
      }

      // set panel height
      panel.element.style.height = panelHeight + "px";

      if (panelWidth < Panel.MIN_WIDTH || panelHeight < panel.minimumHeight)
      {
        panel.element.classList.add("collapsed");
      }
      else
      {
        panel.element.classList.remove("collapsed");
        bottom += panelHeight + this.margin;
      }
    }
    return bottom;
  }

  getMargin()
  {
    if (this.margin >= 0) return this.margin;

    return parseFloat(getComputedStyle(document.documentElement)
       .getPropertyValue("--panel-margin"));
  }

  getLeft()
  {
    return this.resizers.left.width;
  }

  getRight()
  {
    return this.resizers.right.width;
  }

  getTop()
  {
    const application = this.application;
    let top = application.headerElem.getBoundingClientRect().height;
    const toolBar = application.toolBar;
    if (toolBar.position === "top")
    {
      top += toolBar.getClientRect().height + this.margin;
    }
    return top + this.margin;
  }

  getBottom()
  {
    const toolBar = this.application.toolBar;
    if (toolBar?.position === "bottom")
    {
      return this.application.toolBar.getClientRect().height + this.margin;
    }
    return 0;
  }

  notifyChange(type, panel)
  {
    const listeners = this.listeners;
    if (listeners.length > 0)
    {
      const event = { type, panel };
      for (let listener of listeners)
      {
        listener(event);
      }
    }
  }
};

class HorizontalResizer
{
  constructor(panelManager, side)
  {
    this.panelManager = panelManager;
    this.side = side;
    this.height = 0;
    this.width = 0;
    this._resizing = false;

    this.element = document.createElement("div");
    const element = this.element;
    const container = panelManager.container;

    element.className = "h-resizer";
    container.appendChild(element);

    this.restoreWidth();
    this.updateBar();

    let positionX = 0;

    const move = event =>
    {
      let x = event.clientX;
      let dif = x - positionX;

      positionX = x;

      let width = this.width;
      if (side === "left")
      {
        width += dif;
      }
      else
      {
        width -= dif;
      }
      this.fixCollision(width);
    };

    const end = event =>
    {
      this._resizing = false;
      this.saveWidth();

      element.removeEventListener("pointermove", move, false);
      element.removeEventListener("pointerup", end, false);
      element.releasePointerCapture(event.pointerId);
    };

    element.addEventListener("pointerdown", event =>
    {
      positionX = event.clientX;

      this._resizing = true;
      element.addEventListener("pointermove", move, false);
      element.addEventListener("pointerup", end, false);
      element.setPointerCapture(event.pointerId);
    });
  }

  fixCollision(width = this.width)
  {
    const panelManager = this.panelManager;
    const clientWidth = panelManager.container.clientWidth;

    if (this.side === "left")
    {
      let maxWidth =
        clientWidth - panelManager.getRight() - panelManager.getMargin();
      if (width > maxWidth)
      {
        width = maxWidth;
      }
      else if (width < Panel.MIN_WIDTH)
      {
        width = 0;
      }
    }
    else
    {
      let maxWidth =
        clientWidth - panelManager.getLeft() - panelManager.getMargin();
      if (width > maxWidth)
      {
        width = maxWidth;
      }
      else if (width < Panel.MIN_WIDTH)
      {
        width = 0;
      }
    }
    this.width = width;
    this.panelManager.updateLayout();
  }

  updateBar()
  {
    this.element.style.height = this.height + "px";
    this.element.style[this.side] = this.width + "px";
    this.element.style.bottom = this.panelManager.bottom + "px";
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
    const application = this.panelManager.application;
    let value = application.setup.getItem("resizer." + this.side);
    let intValue = value === null ? Panel.DEFAULT_WIDTH : parseInt(value);
    this.width = intValue;
  }

  saveWidth()
  {
    const application = this.panelManager.application;
    application.setup.setItem("resizer." + this.side, Math.round(this.width));
  }
}

export { Panel, PanelManager };