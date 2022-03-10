/*
 * SelectByPropertyTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { PropertySelectorDialog } from "../ui/PropertySelectorDialog.js";
import { Toast } from "../ui/Toast.js";
import { MessageDialog } from "../ui/MessageDialog.js";

class SelectByPropertyTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select_by_property";
    this.label = "tool.select_by_property.label";
    this.help = "tool.select_by_property.help";
    this.className = "select_by_property";
    this.setOptions(options);
    this.immediate = true;

    this.dialog = new PropertySelectorDialog(this.application,
      { title : "title.select_by_property",
        selectValues : true,
        findPropertiesOnSelection : false
      });
    const dialog = this.dialog;
    dialog.addContextButton("add_prop", "button.add",
      () => this.addProperty());
    dialog.addContextButton("add_expr_eq", "=",
      () => this.addExpression("=="));
    dialog.addContextButton("add_expr_neq", "!=",
      () => this.addExpression("!="));
    dialog.addContextButton("add_expr_gt", ">",
      () => this.addExpression(">"));
    dialog.addContextButton("add_expr_lt", "<",
      () => this.addExpression("<"));
    dialog.addContextButton("add_op_and", "And",
      () => this.addOperator("&&"));
    dialog.addContextButton("add_op_or", "Or",
      () => this.addOperator("||"));
    dialog.addContextButton("clear_prop", "button.clear",
      () => this.clearExpression());

    dialog.onAccept = () => this.selectObjects();
  }

  execute()
  {
    this.dialog.show();
  }

  addProperty()
  {
    const dialog = this.dialog;
    if (dialog.isValue) return;

    let path = dialog.getSelectedNodePath();

    let line = '$(';
    for (let i = 0; i < path.length; i++)
    {
      let part = path[i];
      if (i > 0) line += ", ";
      line += '"' + part + '"';
    }
    line += ") ";

    dialog.editor.value += line;
  }

  addExpression(operator)
  {
    const dialog = this.dialog;
    if (!dialog.isValue) return;

    let path = dialog.getSelectedNodePath();
    let value = path[path.length - 1];

    let line = '$(';
    for (let i = 0; i < path.length - 1; i++)
    {
      let part = path[i];
      if (i > 0) line += ", ";
      line += '"' + part + '"';
    }
    line += ") " + operator + " ";
    if (typeof value === "string")
    {
      line += '"' + value + '"';
    }
    else
    {
      line += value;
    }
    dialog.editor.value += line + "\n";
  }

  addOperator(operator)
  {
    const dialog = this.dialog;
    dialog.editor.value += operator + "\n";
  }

  clearExpression()
  {
    const dialog = this.dialog;
    dialog.editor.value = "";
  }

  selectObjects()
  {
    const application = this.application;
    const selection = application.selection;
    const dialog = this.dialog;

    try
    {
      let expression = dialog.editor.value;
      let fn = new Function("object",
        "const $ = (...p) => _readObjectValue_(object, ...p); return " +
        expression + ";");

      let selectedObjects = [];

      application.baseObject.traverse(object =>
      {
        if (fn(object))
        {
          selectedObjects.push(object);
        }
      });
      if (selectedObjects.length > 0)
      {
        selection.add(...selectedObjects);
        dialog.hide();
      }
      Toast.create("message.objects_selected_by_prop", selectedObjects.length)
        .setI18N(application.i18n).show();
    }
    catch (ex)
    {
      MessageDialog.create("ERROR", ex)
        .setClassName("error")
        .setI18N(this.application.i18n).show();
    }
  }
}

window._readObjectValue_ = (object, ...properties) =>
{
  let data = object.userData;
  let i = 0;
  while (i < properties.length && typeof data === "object")
  {
    let property = properties[i];
    data = data[property];
    i++;
  }
  return data;
};

export { SelectByPropertyTool };