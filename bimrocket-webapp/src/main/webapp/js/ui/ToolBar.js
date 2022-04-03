/**
 * ToolBar.js
 *
 * @author realor
 */

import { I18N } from "../i18n/I18N.js";

class ToolBar
{
  constructor(application, element)
  {
    this.application = application;
    this.buttons = [];

    this.buttonsElem = document.createElement("div");
    this.buttonsElem.className = "tool_buttons";
    element.appendChild(this.buttonsElem);

    const toolListener = event =>
    {
      const type = event.type;
      const tool = event.tool;

      if (type === "activated")
      {
        for (let button of this.buttons)
        {
          if (button.tool === tool)
          {
            button.buttonElem.classList.add("selected");
            button.buttonElem.scrollIntoView(
              { block: "center", inline: "nearest" });
          }
        }
      }
      else if (type === "deactivated")
      {
        for (let button of this.buttons)
        {
          if (button.tool === tool)
          {
            button.buttonElem.classList.remove("selected");
          }
        }
      }
    };
    application.addEventListener("tool", toolListener);
  }

  addToolButton(tool, index)
  {
    let button = new ToolButton(this, tool);
    let buttonElem = button.buttonElem;

    const buttonsElem = this.buttonsElem;
    const children = buttonsElem.children;
    if (typeof index === "number" && index < children.length)
    {
      if (index < 0) index = 0;
      let oldElem = children[index];
      buttonsElem.insertBefore(buttonElem, oldElem);
      this.buttons.splice(index, 0, button);
    }
    else
    {
      buttonsElem.appendChild(buttonElem);
      this.buttons.push(button);
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
    I18N.set(buttonElem, "title", tool.label);
    I18N.set(buttonElem, "alt", tool.label);
    buttonElem.className = "tool_button " + tool.className;
    buttonElem.addEventListener('click', () =>
    {
      buttonElem.scrollIntoView({ block: "center", inline: "nearest" });
      this.toolBar.application.useTool(tool);
    }, false);
  }
}

export { ToolBar };

