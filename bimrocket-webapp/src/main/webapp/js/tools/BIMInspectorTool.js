/*
 * BIMInspectorTool.js
 *
 * @author: realor
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { I18N } from "../i18n/I18N.js";

class BIMInspectorTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "bim_inspector";
    this.label = "bim|tool.bim_inspector.label";
    this.help = "bim|tool.bim_inspector.help";
    this.className = "bim_inspector";
    this.immediate = true;
    this.setOptions(options);
  }

  execute()
  {
    const application = this.application;
    const object = application.selection.object;
    if (object && object._ifc)
    {
      const replacer = (key, value) =>
      {
        return (key === "_helper") ? undefined : value;
      };
      const json = JSON.stringify(object._ifc, replacer, 2);

      const dialog = new Dialog(this.label);
      dialog.setSize(600, 500);
      dialog.setI18N(application.i18n);
      dialog.addCode(json);
      let button = dialog.addButton("accept", "button.accept",
        () => dialog.hide());
      dialog.onShow = () => button.focus();
      dialog.show();
    }
    else
    {
      MessageDialog.create(this.label, "bim|message.no_bim_object_selected")
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
  }
}

export { BIMInspectorTool };

