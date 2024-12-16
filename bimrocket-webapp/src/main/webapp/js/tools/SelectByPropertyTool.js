/*
 * SelectByPropertyTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { PropertySelectorDialog } from "../ui/PropertySelectorDialog.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
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
    application.addTool(this);
    this.immediate = true;

    this.dialog = new PropertySelectorDialog(this.application,
      { title : "title.select_by_property",
        selectValues : true,
        findPropertiesOnSelection : false
      });
    const dialog = this.dialog;

    this.addButton = dialog.addContextButton("add_prop", "button.add",
      () => this.addProperty());

    this.eqButton =  dialog.addContextButton("add_expr_eq", "=",
      () => this.addExpression("=="));

    this.neqButton = dialog.addContextButton("add_expr_neq", "!=",
      () => this.addExpression("!="));

    this.ltButton = dialog.addContextButton("add_expr_lt", "<",
      () => this.addExpression("<"));

    this.gtButton = dialog.addContextButton("add_expr_gt", ">",
      () => this.addExpression(">"));

    this.andButton = dialog.addContextButton("add_op_and", "And",
      () => this.addOperator("&&"));

    this.orButton = dialog.addContextButton("add_op_or", "Or",
      () => this.addOperator("||"));

    this.clearButton = dialog.addContextButton("clear_prop", "button.clear",
      () => this.clearExpression());

    dialog.onAccept = () => this.selectObjects();

    dialog.updateContextButtons = () =>
    {
      let path = dialog.getSelectedNodePath();
      let pathLength = path.length;

      this.addButton.disabled = pathLength === 0 || pathLength >= 3;
      this.eqButton.disabled = pathLength !== 3;
      this.neqButton.disabled = pathLength !== 3;
      this.ltButton.disabled = pathLength !== 3;
      this.gtButton.disabled = pathLength !== 3;
    };
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

    dialog.appendCode(line);
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
    dialog.appendCode(line + "\n");
  }

  addOperator(operator)
  {
    const dialog = this.dialog;
    dialog.appendCode(operator + "\n");
  }

  clearExpression()
  {
    const dialog = this.dialog;
    dialog.setCode("");
  }

  selectObjects()
  {
    const application = this.application;
    const selection = application.selection;
    const dialog = this.dialog;

    try
    {
      let objectExpression = dialog.getCode();

      let selectedObjects = application.findObjects(objectExpression,
        application.baseObject, true);

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

export { SelectByPropertyTool };