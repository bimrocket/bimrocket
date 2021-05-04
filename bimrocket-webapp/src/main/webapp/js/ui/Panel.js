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

    var scope = this;
    
    this.titleElem.addEventListener("click", function()
    {
      if (scope.panelManager) scope.panelManager.setAnimationEnabled(true);
      scope.minimized = !scope.minimized;
    }, false);
    
    this.closeButtonElem.addEventListener("click", function()
    {
      if (scope.panelManager) scope.panelManager.setAnimationEnabled(true);
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
    var prevVisible = this.visible;
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
    var prevMinimized = this.minimized;
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
    
    var scope = this;
    window.addEventListener('resize', function(event)
    {
      scope.updateLayout();
    }, false);
  }

  addPanel(panel)
  {
    var index = this.panels.indexOf(panel);
    if (index === -1)
    {
      panel.panelManager = this;
      this.panels.push(panel);
      this.container.appendChild(panel.element);
    }
  }

  removePanel(panel)
  {
    var index = this.panels.indexOf(panel);
    if (index !== -1)
    {
      panel.panelManager = null;
      this.panels.splice(index, 1);
      this.container.removeChild(panel.element);
    }
  }

  getPanels(position, visible)
  {
    var selection = [];
    for (var i = 0; i < this.panels.length; i++)
    {
      var panel = this.panels[i];
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
    var container = this.container;
    var height = container.clientHeight - BIMROCKET.Panel.MARGIN - 1;
    if (this.isLargeScreen())
    {
      var positions = BIMROCKET.Panel.POSITIONS;
      for (var i = 0; i < positions.length; i++)
      {
        var position = positions[i];
        var panels = this.getPanels(position, true);
        this.layoutElements(panels, height);
      }
    }
    else
    {
      var panels = this.getPanels(null, true);
      this.layoutElements(panels, Math.floor(height / 2));
    }
  }

  layoutElements(panels, height)
  {
    var extendedPanelsCount = 0;
    var fixedHeight = 0;
    var total = panels.length;
    for (var i = 0; i < total; i++)
    {
      var panel = panels[i];
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
    
    var availableHeight = height - fixedHeight;
    var extendedPanelHeight = Math.floor(availableHeight / extendedPanelsCount);
    var bottom = this.margin;
    for (var i = 0; i < total; i++)
    {
      var j = total - i - 1;
      var panel = panels[j];
      panel.element.style.bottom = bottom + "px";
      
      var currentPanelHeight;
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
  }

  isLargeScreen()
  {
    return this.container.clientWidth > 768;
  }
};
