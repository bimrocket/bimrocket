/**
 * @author realor
 */
BIMROCKET.AbstractMenuItem = class
{
  constructor(label)
  {
    this.label = label;
    this.menuBar = null;
    this.parentMenu = null;

    this.itemElement = document.createElement("li");
    this.anchorElement = document.createElement("a");
    this.anchorElement.href = "#";
    this.anchorElement.innerHTML = I18N.get(label);
    this.itemElement.appendChild(this.anchorElement);

    var menuItem = this;

    this.anchorElement.addEventListener("mouseenter", function()
    {
      menuItem.anchorElement.focus();
    });
  }
};

BIMROCKET.MenuItem = class extends BIMROCKET.AbstractMenuItem
{
  constructor(tool)
  {
    super(tool.label);

    var menuItem = this;
    var scope = this;

    this.anchorElement.addEventListener("click", function(event)
    {
      if (menuItem.menuBar.isVertical())
      {
        menuItem.menuBar.hide();
      }
      else
      {
        menuItem.menuBar.focusMenuItem(null);
      }
      scope.menuBar.application.useTool(tool);
    });

    this.anchorElement.addEventListener("focusin", function()
    {
      menuItem.menuBar.focusMenuItem(menuItem);
    });
  }
};

BIMROCKET.Menu = class extends BIMROCKET.AbstractMenuItem
{
  constructor(label)
  {
    super(label);
    this.menuItems = []; // child menuItems

    this.listElement = document.createElement("ul");
    this.itemElement.appendChild(this.listElement);
    this.anchorElement.className = "menu";

    var menu = this;

    this.anchorElement.addEventListener("click", function(event)
    {
      event.preventDefault();
      if (menu.isVisible())
      {
        menu.hide();
      }
      else
      {
        menu.menuBar.armed = true;
        menu.drop();
      }
    });

    this.anchorElement.addEventListener("focusin", function()
    {
      var menuBar = menu.menuBar;
      menuBar.focusMenuItem(menu);
      if (menuBar.armed && !menuBar.isVertical())
      {
        menu.drop();
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
      for (var i = 0; i < this.menuItems.length; i++)
      {
        var menuItem = this.menuItems[i];
        if (menuItem instanceof BIMROCKET.Menu)
        {
          menuItem.hide(recursive);
        }
      }
    }
  }

  addMenuItem(tool)
  {
    var menuItem = new BIMROCKET.MenuItem(tool);
    menuItem.menuBar = this.menuBar;
    menuItem.parentMenu = this;
    this.menuItems.push(menuItem);
    this.listElement.appendChild(menuItem.itemElement);
    return menuItem;
  }

  addMenu(label)
  {
    var menu = new BIMROCKET.Menu(label);
    menu.menuBar = this.menuBar;
    menu.parentMenu = this;
    this.menuItems.push(menu);
    this.listElement.appendChild(menu.itemElement);
    return menu;
  }
};

/*** MenuBar ***/

BIMROCKET.MenuBar = class
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

    var menuBar = this;
    this.dropButtonElement = document.createElement("a");
    this.dropButtonElement.innerHTML = "MENU";
    this.dropButtonElement.className = "menu_button";
    this.dropButtonElement.setAttribute("role", "button");
    this.dropButtonElement.setAttribute("aria-pressed", "false");    
    this.dropButtonElement.addEventListener("click", function()
    {
      if (menuBar.isVisible())
      {
        menuBar.dropButtonElement.setAttribute("aria-pressed", "false");
        menuBar.hide();
      }
      else
      {
        menuBar.dropButtonElement.setAttribute("aria-pressed", "true");
        menuBar.drop();
      }
    });
    element.appendChild(this.dropButtonElement);

    var scope = this;
    
    document.body.addEventListener("click", function(event)
    {
      if (scope.armed) 
      {
        // click outside menu ?
        var element = event.srcElement;
        while (element !== null && element !== scope.navElement)
        {
          element = element.parentElement;
        }
        if (element === null)
        {
          event.preventDefault();
          scope.focusMenuItem(null);
        }
      }
    }, true);
    
    window.addEventListener('resize', function()
    {
      scope.hideAllMenus();
    }, false);

    window.addEventListener('keyup', function(event)
    {
      if (scope.armed && event.keyCode === 27)
      {
        scope.hideAllMenus();
      }
    }, false);
  }

  addMenu(label)
  {
    var menu = new BIMROCKET.Menu(label);
    menu.menuBar = this;
    this.menus.push(menu);
    this.listElement.appendChild(menu.itemElement);
    return menu;
  }

  isVisible()
  {
    return this.listElement.className === "menu_drop";
  }

  drop()
  {
    this.listElement.className = "menu_drop";
  }

  hide()
  {
    this.listElement.className = "menu_hide";
  }

  isVertical()
  {
    return document.body.clientWidth < 768;
  }
  
  focusMenuItem(menuItem)
  {
    if (!this.isVertical())
    {
      var menu;
      
      if (this.menuItem) // have previous menuItem
      {
        menu = this.menuItem.parentMenu;
        if (menu)
        {
          for (var i = 0; i < menu.menuItems.length; i++)
          {
            var sibling = menu.menuItems[i];
            if (sibling instanceof BIMROCKET.Menu)
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
      var menu = this.menus[i];
      menu.hide(true);
    }
    this.menuItem = false;
    this.armed = false;    
  }
};

