/**
 * @author realor
 */
BIMROCKET.ToolBar = class
{
  constructor(application, element)
  {
    this.application = application;
    var scope = this;

    this.buttonsElem = document.createElement("div");
    this.buttonsElem.id = "tool_buttons";
    element.appendChild(this.buttonsElem);

    var toolListener = function(event)
    {
      var type = event.type;
      var tool = event.tool;

      if (type === "activated")
      {
        var buttonElem = document.getElementById("tb_" + tool.name);
        if (buttonElem)
        {
          buttonElem.className = "tool_button selected " + tool.className;
        }
      }
      else if (type === "deactivated")
      {
        var buttonElem = document.getElementById("tb_" + tool.name);
        if (buttonElem)
        {
          buttonElem.className = "tool_button " + tool.className;
        }
      }
    };
    application.addEventListener("tool", toolListener);
  }

  addToolButton(tool, index)
  {
    var buttonElem = this.createToolButton(tool);
    if (buttonElem !== null)
    {
      var buttonsElem = this.buttonsElem;
      if (index !== undefined)
      {
        var children = buttonsElem.children;
        if (children.length <= index)
        {
          buttonsElem.appendChild(buttonElem);
        }
        else
        {
          var oldElem = children[index];
          buttonsElem.insertBefore(buttonElem, oldElem);
          buttonsElem.removeChild(oldElem);
        }
      }
      else
      {
        buttonsElem.appendChild(buttonElem);
      }
    }
  }

  createToolButton(tool)
  {
    var application = this.application;
    var buttonElem = null;
    var buttonId = "tb_" + tool.name;
    if (!document.getElementById(buttonId))
    {
      buttonElem = document.createElement("button");
      buttonElem.id = buttonId;
      buttonElem.className = "tool_button " + tool.className;
      buttonElem.title = I18N.get(tool.label);
      buttonElem.addEventListener('click',
        function(event) {application.useTool(tool);}, false);
    }
    return buttonElem;
  }
};

