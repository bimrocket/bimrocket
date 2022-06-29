/*
 * SelectByQRCodeTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Dialog } from "../ui/Dialog.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { Html5QrcodeScanner } from "../lib/html5-qrcode.min.js";

class SelectByQRCodeTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "select_by_qrcode";
    this.label = "tool.select_by_qrcode.label";
    this.className = "select_by_qrcode";
    this.immediate = true;
    this.setOptions(options);

    this.dialog = this.createDialog();
  }

  createDialog()
  {
    this.dialog = new Dialog("title.select_by_qrcode");
    const dialog = this.dialog;
    dialog.setSize(400, 550);
    dialog.setI18N(this.application.i18n);
    const divElem = document.createElement("div");
    divElem.id = "qrcode_reader";
    dialog.bodyElem.appendChild(divElem);
    dialog.addButton("close", "button.close", event => this.closeDialog());
    return dialog;
  }

  execute()
  {
    this.dialog.show();

    const onScanSuccess = (code) =>
    {
      this.closeDialog();
      this.selectObjectsByCode(code);
    };

    this.codeScanner = new Html5QrcodeScanner("qrcode_reader",
      { fps: 10, qrbox: 200 });

    this.codeScanner.render(onScanSuccess);
  }

  closeDialog()
  {
    this.codeScanner.clear();
    this.dialog.hide();
  }

  selectObjectsByCode(code)
  {
    console.info("CODE", code);
    const application = this.application;
    const baseObject = application.baseObject;

    const objects = [];

    console.info("1", objects);

    baseObject.traverse(object =>
    {
      if (object.uuid === code
          || object.name === code
          || this.dataContains(object.userData, code))
      {
        console.info("PUSH", object);

        objects.push(object);
      }
    });

    if (objects.length > 0)
    {
      const container = application.container;
      const aspect = container.clientWidth / container.clientHeight;
      const camera = application.camera;

      application.scene.updateMatrixWorld(true);
      ObjectUtils.zoomAll(camera, objects, aspect, true);

      application.notifyObjectsChanged(camera, this);
      application.selection.set(...objects);
    }
    else
    {
      MessageDialog.create("title.select_by_qrcode",
        "message.no_object_for_code", code)
        .setClassName("info")
        .setI18N(application.i18n).show();
    }
  }

  dataContains(data, code)
  {
    for (let key in data)
    {
      let value = data[key];
      if (typeof value === "object")
      {
        if (this.dataContains(value, code)) return true;
      }
      else if (typeof value === "string")
      {
        if (value === code) return true;
      }
      else if (typeof value === "number")
      {
        if (String(value) === code) return true;
      }
    }
    return false;
  }
}

export { SelectByQRCodeTool };