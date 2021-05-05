/**
 * @author realor
 */
BIMROCKET.Panel = class
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
    this.element.style.margin = BIMROCKET.Panel.MARGIN + "px";

    this.headerElem = document.createElement("div");
    this.headerElem.className = "header";
    this.element.appendChild(this.headerElem);

    this.bodyElem = document.createElement("div");
    this.bodyElem.className = "body";
    this.element.appendChild(this.bodyElem);

    this.titleElem = document.createElement("div");
    this.titleElem.className = "title";
    this.headerElem.appendChild(this.titleElem);

    this.closeButtonElem = document.createElement("div");
    this.closeButtonElem.className = "close";
    this.closeButtonElem.setAttribute("role", "button");
    this.closeButtonElem.setAttribute("aria-label", "close");
    this.headerElem.appendChild(this.closeButtonElem);

    const scope = this;

    this.titleElem.addEventListener("click", function()
    {
      scope.minimized = !scope.minimized;
    }, false);

    this.closeButtonElem.addEventListener("click", function()
    {
      scope.visible = false;
    }, false);

    this._position = null;
    this.position = "left";
  }

  get id()
  {
    return this.element.id;
  }

  set id(id)
  {
    this.element.id = id;
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

  get title()
  {
    return this.titleElem.innerHTML;
  }

  set title(title)
  {
    this.titleElem.innerHTML = I18N.get(title);
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
};

BIMROCKET.PanelManager = class
{
  constructor(container)
  {
    this.container = container || document.body;
    this.margin = 0;
    this.headerHeight = BIMROCKET.Panel.HEADER_HEIGHT;
    this.panels = [];

    this.resizers = {};
    this.resizers.left = new BIMROCKET.PanelResizer(this, "left");
    this.resizers.right = new BIMROCKET.PanelResizer(this, "right");

    const scope = this;

    window.addEventListener('resize', function(event)
    {
      scope.setAnimationEnabled(false);
      scope.updateLayout();
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

  getPanels(position, visible)
  {
    let selection = [];
    for (var i = 0; i < this.panels.length; i++)
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
    const height = container.clientHeight - BIMROCKET.Panel.MARGIN - 1;
    if (this.isLargeScreen())
    {
      this.resizers.left.enabled = true;
      this.resizers.right.enabled = true;

      let positions = BIMROCKET.Panel.POSITIONS;
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
      fixedHeight += BIMROCKET.Panel.MARGIN;
    }

    let availableHeight = height - fixedHeight;
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
            (resizer.width - BIMROCKET.Panel.MARGIN) + "px";
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
      bottom += currentPanelHeight + BIMROCKET.Panel.MARGIN;
    }
    return bottom;
  }

  isLargeScreen()
  {
    return this.container.clientWidth > 768;
  }
};

BIMROCKET.PanelResizer = class
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
    const scope = this;

    element.className = "resizer";
    container.appendChild(element);

    this.restoreWidth();
    this.updateBar();

    const move = function(event)
    {
      scope.width = scope.getCurrentWidth(event);
      scope.updateBar();
      scope.panelManager.updateLayout();
    };

    const reset = function(event)
    {
      container.removeEventListener("mousemove", move, false);
      container.removeEventListener("mouseup", reset, false);
    };

    element.addEventListener("mousedown", function(event)
    {
      container.addEventListener("mousemove", move, false);
      container.addEventListener("mouseup", reset, false);
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
};