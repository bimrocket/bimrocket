/*
 * ScriptDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { GeometryUtils } from "../utils/GeometryUtils.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import { MessageDialog } from "../ui/MessageDialog.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { Toast } from "../ui/Toast.js";
import { Solid } from "../core/Solid.js";
import { SolidGeometry } from "../core/SolidGeometry.js";
import { Cord } from "../core/Cord.js";
import { CordGeometry } from "../core/CordGeometry.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { I18N } from "../i18n/I18N.js";
import { Metadata, Result } from "../io/FileService.js";
import * as THREE from "../lib/three.module.js";

class ScriptDialog extends Dialog
{
  static GLOBALS =
  {
    THREE,
    ObjectUtils,
    GeometryUtils,
    Solid,
    SolidGeometry,
    Cord,
    CordGeometry,
    Profile,
    ProfileGeometry,
    Toast
  };

  constructor(application, saveAction)
  {
    super("title.script_editor");
    this.application = application;
    this.setI18N(this.application.i18n);
    this.scriptName = "";
    this.scriptCode = "";
    this.saved = true;

    this.setSize(640, 540);

    this.nameField = this.addTextField("name", "tool.script.name", "",
      "script_name");

    this.editorView = this.addCodeEditor("editor",
      "label.formula.expression", "",
      { "language" : "javascript", "height" : "calc(100% - 70px)" });

    this.resultElem = document.createElement("div");
    this.resultElem.className = "";
    this.bodyElem.appendChild(this.resultElem);

    this.runButton = this.addButton("run", "button.run", () =>
    {
      this.endEdition();
      this.run(this.scriptCode);
    });

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.endEdition();
      this.hide();
      if (saveAction) saveAction(this.scriptName, this.scriptCode);
    });

    this.closeButton = this.addButton("cancel", "button.close", () =>
    {
      this.endEdition();
      this.hide();
    });

    this.nameField.addEventListener("input", () =>
    {
      this.saveButton.disabled = this.nameField.value.trim().length === 0;
    });
  }

  onShow()
  {
    this.nameField.value = this.scriptName;
    const state = this.editorView.state;
    const tx = state.update(
      { changes: { from: 0, to: state.doc.length, insert: this.scriptCode } });
    this.editorView.dispatch(tx);

    this.saveButton.disabled = this.nameField.value.trim().length === 0;
    if (this.scriptName === "")
    {
      this.nameField.focus();
    }
    else
    {
      this.editorView.focus();
    }
    this.resultElem.innerHTML = "";
  }

  run(code)
  {
    this.addGlobals();
    try
    {
      const fn = new Function(code);
      const result = fn();
      if (result === undefined)
      {
        this.hide();
      }
      else
      {
        this.resultElem.innerHTML = String(result);
        this.resultElem.className = "";
      }
    }
    catch (ex)
    {
      this.resultElem.innerHTML = String(ex);
      this.resultElem.className = "error";
    }
    finally
    {
      this.removeGlobals();
    }
  }

  endEdition()
  {
    this.scriptName = this.nameField.value;
    let code = this.editorView.state.doc.toString();
    if (code !== this.scriptCode)
    {
      this.scriptCode = code;
      this.saved = false;
    }
  };

  addGlobals()
  {
    for (let name in ScriptDialog.GLOBALS)
    {
      window[name] = ScriptDialog.GLOBALS[name];
    }
  }

  removeGlobals()
  {
    for (let name in ScriptDialog.GLOBALS)
    {
      delete window[name];
    }
  }
}

export { ScriptDialog };
