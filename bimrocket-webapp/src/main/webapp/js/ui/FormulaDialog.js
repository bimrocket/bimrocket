/*
 * FormulaDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Formula } from "../formula/Formula.js";
import { I18N } from "../i18n/I18N.js";
import "../lib/codemirror.js";

class FormulaDialog extends Dialog
{
  constructor(inspector, object, formula)
  {
    super("title.formula");
    this.inspector = inspector;
    this.object = object;
    this.setI18N(this.inspector.application.i18n);

    this.setSize(400, 200);

    const path = formula ? formula.path : "";
    const expression = formula ? formula.expression : "";

    this.pathElem = this.addTextField("path", "label.formula.path", path);

    this.expressionLabel = document.createElement("div");
    I18N.set(this.expressionLabel, "innerHTML", "label.formula.expression");
    this.bodyElem.appendChild(this.expressionLabel);

    this.expressionElem = document.createElement("div");
    this.expressionElem.className = "code_editor";

    this.bodyElem.appendChild(this.expressionElem);
    this.initEditor(expression);

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
          Formula.set(this.object, path, expression);
          this.inspector.application.notifyObjectsChanged(this.object);
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
        this.inspector.application.notifyObjectsChanged(this.object);
        this.hide();
      }
    }
  }

  onCancel()
  {
    this.hide();
  }

  initEditor(expression)
  {
    const { keymap, highlightSpecialChars, drawSelection, EditorView } =
      CM["@codemirror/view"];
    const { history, historyKeymap } = CM["@codemirror/history"];
    const { defaultKeymap } = CM["@codemirror/commands"];
    const { bracketMatching } = CM["@codemirror/matchbrackets"];
    const { javascript, javascriptLanguage } = CM["@codemirror/lang-javascript"];
    const { defaultHighlightStyle } = CM["@codemirror/highlight"];
    const { EditorState } = CM["@codemirror/state"];

    let theme = EditorView.theme({
      "&.cm-focused .cm-cursor" : {
        borderLeftColor: "#000",
        borderLeftWidth: "2px"
      },
      "&.cm-focused .cm-matchingBracket" : {
        "backgroundColor" : "yellow",
        "color" : "black"
      },
      "& .ͼa" : {
        "color" : "#444",
        "fontWeight" : "bold"
      },
      "& .ͼl" : {
        "color" : "#808080"
      },
      "& .ͼf" : {
        "color" : "#8080e0"
      },
      "& .ͼd" : {
        "color" : "#2020ff"
      },
      "& .ͼb" : {
        "color" : "#008000"
      },
      "& .cm-wrap" : {
        "height" : "100%"
      },
      "& .cm-scroller" : {
        "overflow" : "auto"
      }
    });

    this.editorView = new EditorView(
    {
      parent: this.expressionElem
    });

    let editorState = EditorState.create(
    {
      doc: expression || "",
        extensions : [
          highlightSpecialChars(),
          drawSelection(),
          history(),
          bracketMatching(),
          defaultHighlightStyle.fallback,
          keymap.of(historyKeymap, defaultKeymap),
          javascript(),
          theme]
    });

    this.editorView.setState(editorState);
  }
}

export { FormulaDialog };
