/*
 * FormulaDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Formula } from "../formula/Formula.js";
import { I18N } from "../i18n/I18N.js";

class FormulaDialog extends Dialog
{
  constructor(application, object, formula)
  {
    super("title.formula");
    this.application = application;
    this.object = object;
    this.setI18N(this.application.i18n);

    this.setSize(640, 300);

    const path = formula ? formula.path : "";
    const expression = formula ? formula.expression : "";

    this.pathElem = this.addTextField("path", "label.formula.path", path,
      "code");

    this.editorView = this.addCodeEditor("editor",
      "label.formula.expression", expression,
      { "language" : "javascript", "height" : "calc(100% - 80px)" });

    this.errorElem = document.createElement("div");
    this.errorElem.className = "error";
    this.bodyElem.appendChild(this.errorElem);

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.cancelButton = this.addButton("cancel", "button.cancel",
      () => this.onCancel());
  }

  onShow()
  {
    if (this.pathElem.value.length === 0)
    {
      this.pathElem.focus();
    }
    else
    {
      this.editorView.focus();
    }
  }

  onAccept()
  {
    const path = this.pathElem.value;
    const expression = this.editorView.state.doc.toString();

    if (path)
    {
      if (expression.length > 0)
      {
        try
        {
          Formula.create(this.object, path, expression);
          this.application.notifyObjectsChanged(this.object, this);
          this.hide();
        }
        catch (ex)
        {
          this.errorElem.innerHTML = String(ex);
        }
      }
      else
      {
        Formula.remove(this.object, path);
        this.application.notifyObjectsChanged(this.object, this);
        this.hide();
      }
    }
  }

  onCancel()
  {
    this.hide();
  }
}

export { FormulaDialog };
