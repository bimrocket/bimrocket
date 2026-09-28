/**
 * ToolBar.js
 *
 * @author realor
 */

import { Controls } from "platform/ui/Controls.js";
import { IconManager } from "platform/ui/IconManager.js";
import { I18N } from "platform/i18n/I18N.js";

class ToolBar
{
  constructor(application, parent)
  {
    this.application = application;
    this.buttonMap = new Map();

    this.element = document.createElement("div");
    this.element.className = "toolbar";
    parent.appendChild(this.element);

    this.scrollElem = document.createElement("div");
    const scrollElem = this.scrollElem;
    scrollElem.className = "toolbar-scroll";
    this.element.appendChild(scrollElem);

    const panelManager = application.panelManager;
    panelManager.addEventListener(event => this.onPanelChange(event));

    this.addSeparator("extra");

    scrollElem.addEventListener("scroll", () => this.updateShadows());

    this.intervalId = null;
    this.scrollIncrement = 2;
    this.scrollInterval = 4;

    const startScroll = amount =>
    {
      if (this.intervalId === null)
      {
        const scrollElem = this.scrollElem;
        scrollElem.scrollLeft += amount;
        this.intervalId = setInterval(() =>
          scrollElem.scrollLeft += amount, this.scrollInterval);
      }
    };

    const stopScroll = () =>
    {
      if (this.intervalId !== null)
      {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };

    const setupListeners = (button, amount) =>
    {
      button.addEventListener("pointerdown", event =>
      {
        if (event.button === 0) startScroll(amount);
      });
      button.addEventListener("contextmenu", event => event.preventDefault());
      button.addEventListener("pointerup", stopScroll);
      button.addEventListener("pointerleave", stopScroll);
      button.addEventListener("touchstart",
        event => event.preventDefault(), { passive: false });
    };

    // left shadow button
    this.shadowBeforeButton = document.createElement("button");
    this.shadowBeforeButton.className = "scroll-button before";
    Controls.addIcon(this.shadowBeforeButton, "chevron-left");
    this.element.appendChild(this.shadowBeforeButton);
    setupListeners(this.shadowBeforeButton, -this.scrollIncrement);

    // right shadow button
    this.shadowAfterButton = document.createElement("button");
    this.shadowAfterButton.className = "scroll-button after";
    Controls.addIcon(this.shadowAfterButton, "chevron-right");
    this.element.appendChild(this.shadowAfterButton);
    setupListeners(this.shadowAfterButton, this.scrollIncrement);

    window.addEventListener("resize", () => this.updateShadows());
  }

  addToolButton(tool, spec)
  {
    if (this.buttonMap.has(tool))
    {
      this.removeToolButton(tool);
    }

    const button = new ToolButton(this, tool);
    const buttonElem = button.buttonElem;
    const scrollElem = this.scrollElem;

    if (typeof spec === "number")
    {
      let index = spec;
      const children = scrollElem.children;
      if (index < children.length)
      {
        // insert at index
        if (index < 0) index = 0;
        let nextElem = children[index];
        scrollElem.insertBefore(buttonElem, nextElem);
      }
    }
    else if (typeof spec === "string")
    {
      // add to the end of the separator block
      let sepName = spec;
      if (sepName === "extra")
      {
        scrollElem.appendChild(buttonElem);
      }
      else
      {
        let sepElem = scrollElem.querySelector("div[data-name=" + sepName + "]");
        if (sepElem)
        {
          sepElem = sepElem.nextElementSibling;
          while (sepElem && !sepElem.classList.has("separator"))
          {
            sepElem = sepElem.nextElementSibling;
          }
          if (sepElem)
          {
            scrollElem.insertBefore(buttonElem, sepElem);
          }
        }
      }
    }

    if (!buttonElem.parentElement)
    {
      // add before extra separator
      const extraSepElem = scrollElem.querySelector("div[data-name=extra]");
      scrollElem.insertBefore(buttonElem, extraSepElem);
    }

    this.application.i18n.update(buttonElem);

    this.buttonMap.set(tool, button);
    this.updateShadows();
    return button;
  }

  removeToolButton(tool)
  {
    const button = this.buttonMap.get(tool);
    if (button)
    {
      button.buttonElem.remove();
      this.buttonMap.delete(tool);
      this.updateShadows();
    }
  }

  getToolButton(tool)
  {
    return this.buttonMap.get(tool);
  }

  addSeparator(name)
  {
    const scrollElem = this.scrollElem;
    const sepElem = document.createElement("div");
    sepElem.className = "separator";
    sepElem.dataset.name = name;
    const extraSepElem = scrollElem.querySelector("div[data-name=extra]");
    scrollElem.insertBefore(sepElem, extraSepElem);
  }

  removeSeparator(name)
  {
    if (name === "extra") return;

    const scrollElem = this.scrollElem;
    let sepElem = scrollElem.querySelector("div[data-name=" + name + "]");
    if (sepElem)
    {
      sepElem.remove();
    }
  }

  get visible()
  {
    return !this.element.classList.contains("hidden");
  }

  set visible(visible)
  {
    if (visible)
    {
      this.element.classList.remove("hidden");
    }
    else
    {
      this.element.classList.add("hidden");
    }
  }

  get position()
  {
    return this.element.classList.contains("top") ? "top" : "bottom";
  }

  set position(position)
  {
    if (position === "top")
    {
      this.element.classList.add("top");
    }
    else
    {
      this.element.classList.remove("top");
    }
  }

  getClientRect()
  {
    return this.element.getBoundingClientRect();
  }

  updateShadows()
  {
    const element = this.element;
    const scrollElem = this.scrollElem;

    const hasBefore = scrollElem.scrollLeft > 0;

    const hasAfter = scrollElem.scrollLeft + scrollElem.clientWidth <
      scrollElem.scrollWidth - 1;

    element.classList.toggle("has-shadow-before", hasBefore);
    element.classList.toggle("has-shadow-after", hasAfter);
  }

  onPanelChange(event)
  {
    const { type, panel } = event;
    let tool = panel.tool;
    if (tool)
    {
      let button = this.getToolButton(tool);
      if (!button)
      {
        button = this.addToolButton(tool, "extra");
      }

      if (type === "deactivate")
      {
        let elem = this.scrollElem.lastElementChild;
        while (elem)
        {
          if (elem.classList.contains("separator")) break;
          if (elem === button.buttonElem)
          {
            this.removeToolButton(tool);
            return;
          }
          elem = elem.previousElementSibling;
        }
      }
      button.updateState();
    }
  }
}

class ToolButton
{
  constructor(toolBar, tool)
  {
    this.toolBar = toolBar;
    this.tool = tool;
    this.buttonElem = document.createElement("button");
    let buttonElem = this.buttonElem;
    buttonElem.dataset.name = tool.name;
    I18N.set(buttonElem, "title", tool.label);
    I18N.set(buttonElem, "alt", tool.label);
    buttonElem.classList.add("tool-button");
    const iconName = tool.getIconName();
    if (iconName)
    {
      const icon = Controls.addIcon(buttonElem, iconName, "tool");
    }
    else
    {
      buttonElem.classList.add(tool.className);
    }
    buttonElem.addEventListener("click", () =>
    {
      this.scrollButtonIntoView();
      this.toolBar.application.useTool(tool);
    }, false);
  }

  scrollButtonIntoView()
  {
    const buttonElem = this.buttonElem;
    const scrollElem = this.toolBar.scrollElem;

    const buttonRect = buttonElem.getBoundingClientRect();
    const scrollRect = scrollElem.getBoundingClientRect();
    const margin = 24;

    if (buttonRect.left < scrollRect.left + margin)
    {
      scrollElem.scrollBy(
      {
        left: buttonRect.left - (scrollRect.left + margin),
        behavior: "smooth"
      });
    }
    else if (buttonRect.right > scrollRect.right - margin)
    {
      scrollElem.scrollBy(
      {
        left: buttonRect.right - (scrollRect.right - margin),
        behavior: "smooth"
      });
    }
  }

  updateState()
  {
    const panel = this.tool.panel;
    if (panel)
    {
      if (panel.activated)
      {
        this.buttonElem.classList.add("activated");
        if (this.tool === this.toolBar.application.tool)
        {
          this.buttonElem.classList.add("selected");
        }
        if (panel.minimized)
        {
          this.buttonElem.classList.add("minimized");
        }
        else
        {
          this.buttonElem.classList.remove("minimized");
        }
        this.scrollButtonIntoView();
      }
      else
      {
        this.buttonElem.classList.remove("activated");
        this.buttonElem.classList.remove("selected");
        this.buttonElem.classList.remove("minimized");
      }
    }
  }
}

export { ToolBar };

