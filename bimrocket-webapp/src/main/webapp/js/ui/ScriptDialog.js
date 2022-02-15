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

    this.setSize(760, 600);

    const editorHeight = 75;
    const consoleHeight = 100 - editorHeight;

    this.nameField = this.addTextField("name", "tool.script.name", "",
      "script_name");

    this.editorView = this.addCodeEditor("editor",
      "label.formula.expression", "",
      { "language" : "javascript",
        "height" : "calc(" + editorHeight + "% - 38px)" });

    this.consoleElem = document.createElement("div");
    this.consoleElem.className = "console";
    this.consoleElem.style.height = consoleHeight + "%";
    this.bodyElem.appendChild(this.consoleElem);

    this.runButton = this.addButton("run", "button.run", () =>
    {
      this.endEdition();
      this.run(this.scriptCode);
    });

    this.saveButton = this.addButton("save", "button.save", () =>
    {
      this.endEdition();
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
  }

  clearConsole()
  {
    this.consoleElem.innerHTML = "";
  }

  run(code)
  {
    let error = null;
    this.enterConsole();
    try
    {
      this.consoleElem.innerHTML = "";
      const fn = new Function(code);
      let t0 = Date.now();
      fn();
      let t1 = Date.now();
      this.log("info", "Execution completed in " + (t1 - t0) + " ms.");
    }
    catch (ex)
    {
      this.log("error", ex);
      error = ex;
    }
    finally
    {
      this.exitConsole();
    }
    return error;
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

  log(className, ...args)
  {
    for (let arg of args)
    {
      let message = document.createElement("div");
      message.className = className;
      message.innerHTML = String(arg);
      this.consoleElem.appendChild(message);
    }
  }

  enterConsole()
  {
    this.console = console;

    console = {
      log : (...args) => this.log("info", args),
      info : (...args) => this.log("info", args),
      warn : (...args) => this.log("warn", args),
      error : (...args) => this.log("error", args)
    };

    for (let name in ScriptDialog.GLOBALS)
    {
      window[name] = ScriptDialog.GLOBALS[name];
    }
  }

  exitConsole()
  {
    console = this.console;

    for (let name in ScriptDialog.GLOBALS)
    {
      delete window[name];
    }
  }
}

export { ScriptDialog };
