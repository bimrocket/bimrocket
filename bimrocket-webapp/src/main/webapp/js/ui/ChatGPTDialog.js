/*
 * ChatGPTDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Formula } from "../formula/Formula.js";
import { I18N } from "../i18n/I18N.js";

class ChatGPTDialog extends Dialog
{
  constructor(application, setup)
  {
    super("title.chatgpt_setup");
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(800, 600);

    this.editorView = this.addCodeEditor("editor",
      "label.chatgpt_setup", JSON.stringify(setup, null, 2),
      { "language" : "json", className : "flex_grow_1"  });

    this.errorElem = document.createElement("div");
    this.errorElem.className = "error hidden";
    this.bodyElem.appendChild(this.errorElem);
    this.bodyElem.classList.add("flex");
    this.bodyElem.classList.add("flex_column");

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    this.editorView.focus();
    this.errorElem.classList.add("hidden");
  }

  onHide()
  {
    this.editorView.destroy();
  }

  onAccept()
  {
    const json = this.editorView.state.doc.toString();
    try
    {
      const setup = JSON.parse(json);
      this.setSetup(setup);
      this.hide();
    }
    catch (ex)
    {
      this.errorElem.classList.remove("hidden");
      this.errorElem.textContent = ex;
    }
  }

  onCancel()
  {
    this.hide();
  }

  setSetup(setup)
  {
    console.info(setup);
  }
}

export { ChatGPTDialog };
