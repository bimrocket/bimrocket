/*
 * ScriptDialog.js
 *
 * @author realor
 */

import { GeometryUtils } from "platform/utils/GeometryUtils.js";
import { ObjectUtils } from "platform/utils/ObjectUtils.js";
import { Solid } from "platform/core/Solid.js";
import { SolidGeometry } from "platform/core/SolidGeometry.js";
import { Profile } from "platform/core/Profile.js";
import { ProfileGeometry } from "platform/core/ProfileGeometry.js";
import { Cord } from "platform/core/Cord.js";
import { CordGeometry } from "platform/core/CordGeometry.js";
import { Text2D } from "platform/core/Text2D.js";
import { Dialog } from "platform/ui/dialog/Dialog.js";
import { MessageDialog } from "platform/ui/dialog/MessageDialog.js";
import { ConfirmDialog } from "platform/ui/dialog/ConfirmDialog.js";
import { Controls } from "platform/ui/Controls.js";
import { Toast } from "platform/ui/toast/Toast.js";
import { Tree } from "platform/ui/tree/Tree.js";
import { TabbedPane } from "platform/ui/tabbedpane/TabbedPane.js";
import { ObjectBuilder } from "platform/builders/ObjectBuilder.js";
import { Controller } from "platform/controllers/Controller.js";
import { Formula } from "platform/formula/Formula.js";

import * as CM from "platform/lib/codemirror.js";
import * as THREE from "three";

const GLOBALS =
{
  THREE,
  CM,
  ObjectUtils,
  GeometryUtils,
  Solid,
  SolidGeometry,
  Profile,
  ProfileGeometry,
  Cord,
  CordGeometry,
  Text2D,
  Dialog,
  MessageDialog,
  ConfirmDialog,
  Controls,
  Toast,
  Tree,
  TabbedPane,
  ObjectBuilder,
  Controller,
  Formula
};

for (let name in GLOBALS)
{
  window[name] = GLOBALS[name];
}

class ScriptDialog extends Dialog
{
  constructor(fileExplorer)
  {
    super("base|title.script_editor");
    this.fileExplorer = fileExplorer;
    this._changed = false;
    this._scriptName = null;

    const application = fileExplorer.application;

    this.setI18N(application.i18n);

    this.setSize(760, 600);
    this.bodyElem.classList.add("flex");
    this.bodyElem.classList.add("flex-column");

    this.nameField = this.addTextField("name", "base|tool.script.name", "",
      "script_name");
    this.nameField.setAttribute("spellcheck", "false");
    this.nameField.addEventListener("input", () =>
    {
      this.saveButton.disabled = !this.nameField.value.trim();
    });

    this.editorView = this.addCodeEditor("editor",
      "label.formula.expression", "",
      { language : "javascript", className : "flex-grow-1" });

    this.consoleElem = document.createElement("div");
    this.consoleElem.className = "console";
    this.bodyElem.appendChild(this.consoleElem);

    this.saveButton = this.addButton("save",
      "button.save", () => this.onSave());

    this.runButton = this.addButton("run", "button.run",
      () => this.run());

    this.closeButton = this.addButton("close",
      "button.close", () => this.hide());
  }

  get scriptName()
  {
    return this.nameField.value;
  }

  set scriptName(scriptName)
  {
    this.nameField.value = scriptName;
    this.saveButton.disabled = !scriptName?.trim();
  }

  get scriptCode()
  {
    return this.editorView.state.doc.toString();
  }

  set scriptCode(code)
  {
    this._changed = false;

    if (!code || code !== this.scriptCode)
    {
      Controls.setCodeEditorDocument(this.editorView, code,
        { language : "javascript" });

      const changeListener = CM.EditorView.updateListener.of(update =>
      {
        if (update.docChanged && this.visible)
        {
          this._changed = true;
        }
      });

      this.editorView.dispatch(
      {
        effects: CM.StateEffect.appendConfig.of(changeListener),
        selection: CM.EditorSelection.cursor(0),
        scrollIntoView: true
      });
    }
  }

  onShow()
  {
    if (this.scriptName === "")
    {
      this.nameField.focus();
    }
    else
    {
      this.editorView.focus();
    }
    this._scriptName = this.scriptName;
  }

  hide()
  {
    if (this._changed)
    {
      const application = this.fileExplorer.application;

      ConfirmDialog.create("title.confirm_save",
        "question.discard_changes", this.scriptName)
        .setAction(() =>
        {
          this.scriptCode = "";
          this._changed = false;
          this._scriptName = null;
          this.clearConsole();
          super.hide();

          Toast.create("message.changes_discarded")
            .setI18N(application.i18n).show();
        })
        .setI18N(application.i18n)
        .setAcceptLabel("button.yes")
        .setCancelLabel("button.no")
        .show();
    }
    else
    {
      super.hide();
    }
  }

  async onSave()
  {
    const fileExplorer = this.fileExplorer;
    const application = fileExplorer.application;

    this.completeName();

    if (fileExplorer.service)
    {
      const isNew = this.scriptName !== this._scriptName;
      if (isNew)
      {
        if (!await fileExplorer.confirmSave(this.scriptName)) return;
      }

      fileExplorer.save(this.scriptName, this.scriptCode, () =>
      {
        this._changed = false;
        this._scriptName = this.scriptName;
      });
    }
    else
    {
      MessageDialog.create("ERROR", "message.select_directory")
        .setClassName("error")
        .setI18N(application.i18n).show();
    }
  }

  clearConsole()
  {
    this.consoleElem.innerHTML = "";
  }

  run()
  {
    const application = this.fileExplorer.application;
    let error = null;
    this.enterConsole();
    try
    {
      this.consoleElem.innerHTML = "";
      const fn = new Function(this.scriptCode);
      let t0 = Date.now();
      let result = fn();
      let t1 = Date.now();
      if (result instanceof Dialog)
      {
        result.show();
      }
      else
      {
        this.log("info", "Execution completed in " + (t1 - t0) + " ms.");
        if (result !== undefined) this.log("info", "Result: " + result);
        Toast.create("base|message.script_executed")
          .setI18N(application.i18n).show();
      }
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

  log(className, ...args)
  {
    for (let arg of args)
    {
      let message = document.createElement("div");
      message.className = className;
      message.textContent = String(arg);
      this.consoleElem.appendChild(message);
    }
  }

  enterConsole()
  {
    this.console = console;

    window.console = {
      log : (...args) => this.log("info", ...args),
      info : (...args) => this.log("info", ...args),
      warn : (...args) => this.log("warn", ...args),
      error : (...args) => this.log("error", ...args)
    };
  }

  exitConsole()
  {
    window.console = this.console;
  }

  completeName()
  {
    let scriptName = this.scriptName.trim();
    if (!scriptName.endsWith(".js"))
    {
      scriptName += ".js";
    }
    this.scriptName = scriptName;
  }
}

export { ScriptDialog };
