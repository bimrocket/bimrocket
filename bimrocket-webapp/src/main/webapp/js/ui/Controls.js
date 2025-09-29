/**
 * Controls.js
 *
 * @author realor
 */

import "../lib/codemirror.js";
import htm from "../lib/htm.js"
import { I18N } from "../i18n/I18N.js";

class Controls
{
  static nextId = 0;

  static addText(parent, text, className)
  {
    const textElem = document.createElement("span");
    I18N.set(textElem, "textContent", text);
    if (className) textElem.className = className;

    parent.appendChild(textElem);
    return textElem;
  }

  static addTextWithArgs(parent, text, args = [], className)
  {
    const textElem = document.createElement("span");
    I18N.set(textElem, "textContent", text, ...args);
    if (className) textElem.className = className;

    parent.appendChild(textElem);
    return textElem;
  }

  static addCode(parent, text, className)
  {
    const textElem = document.createElement("pre");
    textElem.textContent = text;
    if (className) textElem.className = className;

    parent.appendChild(textElem);
    return textElem;
  }

  static addLink(parent, label, url, title, className, action)
  {
    const linkElem = document.createElement("a");
    parent.appendChild(linkElem);

    if (className) linkElem.className = className;
    if (label) I18N.set(linkElem, "textContent", label);
    if (url) linkElem.href = url;
    if (title)
    {
      I18N.set(linkElem, "title", title);
      I18N.set(linkElem, "alt", title);
    }
    if (action)
    {
      linkElem.addEventListener("click", action, false);
    }
    return linkElem;
  }

  static addTextField(parent, name, label, value, className)
  {
    return Controls.addInputField(parent, "text", name, label, value,
      className);
  }

  static addNumberField(parent, name, label, value, className)
  {
    return Controls.addInputField(parent, "number", name, label, value,
      className);
  }

  static addPasswordField(parent, name, label, value, className)
  {
    return Controls.addInputField(parent, "password", name, label, value,
      className);
  }

  static addDateField(parent, name, label, value, className)
  {
    return Controls.addInputField(parent, "date", name, label, value,
      className);
  }

  static addColorField(parent, name, label, value, className)
  {
    return Controls.addInputField(parent, "color", name, label, value,
      className);
  }

  static addCheckBoxField(parent, name, label, checked, className)
  {
    const id = this.getNextId();
    const groupElem = Controls.addField(parent, id, label, className);

    const labelElem = groupElem.childNodes[0];

    const inputElem = document.createElement("input");
    inputElem.id = id;
    inputElem.name = name;
    inputElem.type = "checkbox";
    inputElem.checked = Boolean(checked);
    groupElem.insertBefore(inputElem, labelElem);

    return inputElem;
  }

  static addInputField(parent, type, name, label, value, className)
  {
    const id = this.getNextId();
    const groupElem = Controls.addField(parent, id, label, className);

    const inputElem = document.createElement("input");
    inputElem.id = id;
    inputElem.name = name;
    inputElem.type = type || "text";
    if (value !== undefined && value !== null) inputElem.value = value;
    groupElem.appendChild(inputElem);

    return inputElem;
  }

  static addTextAreaField(parent, name, label, value, className)
  {
    const id = this.getNextId();
    const groupElem = Controls.addField(parent, id, label, className);

    const textAreaElem = document.createElement("textarea");
    textAreaElem.id = id;
    textAreaElem.name = name;
    if (value) textAreaElem.value = value;
    groupElem.appendChild(textAreaElem);

    return textAreaElem;
  }

  static addSelectField(parent, name, label, options, value, className)
  {
    const id = this.getNextId();
    const groupElem = Controls.addField(parent, id, label, className);

    const selectElem = document.createElement("select");
    selectElem.id = id;
    selectElem.name = name;
    groupElem.appendChild(selectElem);

    if (options)
    {
      Controls.setSelectOptions(selectElem, options);
    }

    if (value)
    {
      Controls.setSelectValue(selectElem, value);
    }
    return selectElem;
  }

  static setSelectOptions(selectElem, options, value = selectElem.value, create)
  {
    selectElem.innerHTML = "";
    if (options instanceof Array)
    {
      for (let option of options)
      {
        let optionValue;
        let optionLabel;
        let optionDisabled;
        if (option instanceof Array)
        {
          optionValue = option[0];
          optionLabel = option[1] || optionValue;
          optionDisabled = option[2] || false;
        }
        else if (typeof option === "string")
        {
          optionValue = option;
          optionLabel = option;
          optionDisabled = false;
        }
        else continue;

        let optionElem = document.createElement("option");
        optionElem.value = optionValue;
        I18N.set(optionElem, "textContent", optionLabel);
        if (optionDisabled)
        {
          optionElem.disabled = true;
        }
        selectElem.appendChild(optionElem);
      }
      if (value)
      {
        Controls.setSelectValue(selectElem, value, create);
      }
    }
  }

  static setSelectValue(selectElem, value = selectElem.value, create)
  {
    let found = false;
    for (let option of selectElem.options)
    {
      if (option.value === value)
      {
        found = true;
        break;
      }
    }
    if (found)
    {
      selectElem.value = value;
    }
    else if (value && create)
    {
      let optionElem = document.createElement("option");
      optionElem.value = value;
      optionElem.textContent = value;
      selectElem.appendChild(optionElem);
      selectElem.value = value;
    }
    else if (selectElem.options.length > 0)
    {
      // select first
      selectElem.value = selectElem.options[0].value;
    }
  }

  static addRangeField(parent, name, label, min = 0, max = 100,
    step = 1, value, className)
  {
    const id = this.getNextId();

    const rangeDiv = document.createElement("div");
    rangeDiv.className = className || "option_block";
    parent.appendChild(rangeDiv);

    const rangeValueDiv = document.createElement("div");
    rangeDiv.appendChild(rangeValueDiv);

    const rangeLabel = document.createElement("label");
    I18N.set(rangeLabel, "textContent", label);
    rangeLabel.htmlFor = id;
    rangeLabel.style.verticalAlign = "middle";
    rangeValueDiv.appendChild(rangeLabel);

    const rangeValue = document.createElement("span");
    rangeValue.textContent = value;
    rangeValue.id = id + "_value";
    rangeValue.style.marginLeft = "4px";
    rangeValue.style.verticalAlign = "middle";
    rangeValueDiv.appendChild(rangeValue);

    const range = document.createElement("input");
    range.id = id;
    range.name = name;
    range.type = "range";
    range.min = min;
    range.max = max;
    range.value = value;
    range.step = step;
    range.style.display = "inline-block";
    range.style.width = "80%";
    range.style.marginLeft = "auto";
    range.style.marginRight = "auto";
    range.formatValue = value => value;

    Object.defineProperty(range, 'rangeValue',
    {
      get: function()
      {
        return range.value;
      },

      set: function(value)
      {
        range.value = value;
        rangeValue.textContent = range.formatValue(value);
      }
    });

    range.addEventListener("input", () =>
    {
      rangeValue.textContent = range.formatValue(range.value);
    });

    rangeDiv.appendChild(range);

    return range;
  }

  static addRadioButtons(parent, name, label, options, value, className,
    clickListener)
  {
    const groupElem = document.createElement("fieldset");
    parent.appendChild(groupElem);
    if (className) groupElem.className = className;

    if (label)
    {
      const legendElem = document.createElement("legend");
      groupElem.appendChild(legendElem);
      I18N.set(legendElem, "textContent",label);
    }

    const id = this.getNextId();
    const hiddenElem = document.createElement("input");
    hiddenElem.type = "hidden";
    hiddenElem.id = id;
    groupElem.appendChild(hiddenElem);

    for (let i = 0; i < options.length; i++)
    {
      let option = options[i];

      let radioElem = document.createElement("input");
      radioElem.id = id + "_" + i;
      radioElem.type = "radio";
      radioElem.name = name;
      radioElem.value = option instanceof Array ? option[0] : option;
      if (value === radioElem.value)
      {
        radioElem.checked = true;
        hiddenElem.value = radioElem.value;
      }
      radioElem.addEventListener("click", function(event)
      {
        let elem = event.target;
        hiddenElem.value = elem.value;
        if (clickListener) clickListener(event);
      }, false);

      let labelElem = document.createElement("label");
      let spanElem = document.createElement("span");

      I18N.set(spanElem, "textContent",
        option instanceof Array ? option[1] : option);
      labelElem.htmlFor = radioElem.id;

      labelElem.appendChild(radioElem);
      labelElem.appendChild(spanElem);
      groupElem.appendChild(labelElem);
    }
    return hiddenElem;
  }

  static addButton(parent, name, label, action, className)
  {
    const buttonElem = document.createElement("button");
    buttonElem.name = name;
    I18N.set(buttonElem, "textContent", label);
    if (className) buttonElem.className = className;
    buttonElem.addEventListener("click", event => action(event), false);
    parent.appendChild(buttonElem);

    return buttonElem;
  }

  static addImageButton(parent, name, label, action, className)
  {
    const buttonElem = document.createElement("button");
    buttonElem.name = name;
    I18N.set(buttonElem, "title", label);
    I18N.set(buttonElem, "alt", label);

    if (className) buttonElem.className = className;
    buttonElem.addEventListener("click", event => action(event), false);
    parent.appendChild(buttonElem);

    return buttonElem;
  }

  static addCodeEditor(parent, name, label, value = "", options = {})
  {
    const groupElem = document.createElement("div");
    groupElem.className = "code_editor";
    parent.appendChild(groupElem);

    const labelElem = document.createElement("span");
    I18N.set(labelElem, "textContent", label);
    groupElem.appendChild(labelElem);

    if (options.height)
    {
      groupElem.style.height = options.height;
    }

    const editorElem = document.createElement("div");
    editorElem.className = "cm-editor-holder";
    groupElem.appendChild(editorElem);

    const { EditorView } = CM["@codemirror/view"];

    const editorView = new EditorView(
    {
      parent: editorElem
    });

    this.setCodeEditorDocument(editorView, value, options);

    return editorView;
  }

  static setCodeEditorDocument(editorView, value = "", options)
  {
    const { basicSetup } = CM["codemirror"];
    const { keymap, highlightSpecialChars, highlightActiveLine,
            drawSelection, EditorView } = CM["@codemirror/view"];
    const { defaultKeymap } = CM["@codemirror/commands"];
    const { searchKeymap, highlightSelectionMatches } = CM["@codemirror/search"];
    const { indentOnInput } = CM["@codemirror/language"];
    const { EditorState } = CM["@codemirror/state"];

    let theme = EditorView.theme({
      "&.cm-focused .cm-cursor" : {
        borderLeftColor: "#000",
        borderLeftWidth: "2px"
      },
      "&.cm-focused .cm-matchingBracket" : {
        "backgroundColor" : "#e0e040",
        "color" : "black"
      },
      "& .ͼb" : {
        "color" : "#444",
        "fontWeight" : "bold"
      },
      "& .ͼe" : {
        "color" : "#2020ff"
      },
      "& .ͼf" : {
        "color" : "#8080e0"
      },
      "& .ͼg" : {
        "color" : "#444"
      },
      "& .ͼm" : {
        "color" : "#808080"
      },
      "& .cm-wrap" : {
        "height" : "100%"
      },
      "& .cm-scroller" : {
        "overflow" : "auto"
      }
    });

    const extensions = [
      basicSetup,
      highlightSpecialChars(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      theme];

    const language = options?.language || "json";
    switch (language)
    {
      case "json":
        const { json } = CM["@codemirror/lang-json"];
        extensions.push(json());
        break;

      case "javascript":
        const { javascript } = CM["@codemirror/lang-javascript"];
        extensions.push(javascript());
        break;

      case "xml":
        const { xml } = CM["@codemirror/lang-xml"];
        extensions.push(xml({ autoCloseTags : true }));
        break;

      case "sql":
        const { sql } = CM["@codemirror/lang-sql"];
        extensions.push(sql(options.sqlConfig));
        break;
    }

    const editorState = EditorState.create(
    {
      doc: value || "",
      extensions : extensions
    });

    editorView.setState(editorState);

    return editorView;
  }

  static addTagsInput(parent, name, label, placeholderKey, initialTags = [], className)
  {
    const id = this.getNextId();
    const groupElem = document.createElement("div");
    groupElem.id = id;
    if (className) groupElem.className = className;
    parent.appendChild(groupElem);

    const labelElem = document.createElement("label");
    I18N.set(labelElem, "textContent", label);
    groupElem.appendChild(labelElem);
    labelElem.htmlFor = id + "_input";

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tags-container";
    groupElem.appendChild(tagsContainer);

    const tagsInput = document.createElement("input");
    tagsInput.id = id + "_input";
    tagsInput.type = "text";
    I18N.set(tagsInput, "placeholder", placeholderKey);
    tagsContainer.appendChild(tagsInput);

    const tagsDisplay = document.createElement("div");
    tagsDisplay.className = "tags-display";
    tagsContainer.appendChild(tagsDisplay);

    const removeElem = document.createElement("div");
    removeElem.className = "hidden";
    I18N.set(removeElem, "textContent", "button.delete");
    tagsContainer.appendChild(removeElem);

    const tags = [...initialTags];

    const updateTagsDisplay = () =>
    {
      tagsDisplay.innerHTML = "";

      tags.forEach((tag, index) =>
      {
        const tagElement = document.createElement("span");
        tagElement.className = "tag";
        tagElement.textContent = tag;

        const removeBtn = document.createElement("button");
        removeBtn.className = "tag-remove";
        removeBtn.title = removeElem.textContent;
        removeBtn.addEventListener("click", (e) =>
        {
          e.stopPropagation();
          tags.splice(index, 1);
          updateTagsDisplay();
        });

        tagElement.appendChild(removeBtn);
        tagsDisplay.appendChild(tagElement);
      });
    };

    tagsInput.addEventListener("keydown", (e) =>
    {
      if (e.key === "Enter" || e.key === ",")
      {
        e.preventDefault();
        const tagText = tagsInput.value.trim();
        if (tagText && !tags.includes(tagText))
        {
          tags.push(tagText);
          tagsInput.value = "";
          updateTagsDisplay();
        }
      }
    });

    tagsInput.addEventListener("blur", (e) =>
    {
      const tagText = tagsInput.value.trim();
      if (tagText && !tags.includes(tagText))
      {
        tags.push(tagText);
        tagsInput.value = "";
        updateTagsDisplay();
      }
    });

    updateTagsDisplay();

    return {
      element: groupElem,
      getTags: () => [...tags],
      setTags: (newTags) =>
      {
        tags.length = 0;
        tags.push(...newTags);
        updateTagsDisplay();
      },
      addTag: (tag) =>
      {
        if (!tags.includes(tag))
        {
          tags.push(tag);
          updateTagsDisplay();
        }
      },
      removeTag: (tag) =>
      {
        const index = tags.indexOf(tag);
        if (index !== -1)
        {
          tags.splice(index, 1);
          updateTagsDisplay();
        }
      },
      clearTags: () =>
      {
        tags.length = 0;
        updateTagsDisplay();
      }
    };
  }

  static addField(parent, id, label, className)
  {
    const groupElem = document.createElement("div");
    if (className) groupElem.className = className;
    parent.appendChild(groupElem);

    const labelElem = document.createElement("label");
    labelElem.htmlFor = id;
    I18N.set(labelElem, "textContent", label);
    groupElem.appendChild(labelElem);

    return groupElem;
  }

  static addTable(parent, name, columns, className)
  {
    const tableElem = document.createElement("table");
    parent.appendChild(tableElem);
    tableElem.id = name;
    if (className) tableElem.className = className;

    const headElem = document.createElement("thead");
    tableElem.appendChild(headElem);

    const bodyElem = document.createElement("tbody");
    tableElem.appendChild(bodyElem);

    const footElem = document.createElement("tfoot");
    tableElem.appendChild(footElem);

    if (columns)
    {
      const headRowElem = document.createElement("tr");
      headElem.appendChild(headRowElem);

      for (let i = 0; i < columns.length; i++)
      {
        const headColElem = document.createElement("th");
        headRowElem.appendChild(headColElem);
        I18N.set(headColElem, "textContent",  columns[i]);
        headColElem.className = "col_" + i;
      }
    }
    return tableElem;
  }

  static addTableRow(tableElem)
  {
    const columns = tableElem.tHead.children[0].children.length;
    const bodyElem = tableElem.tBodies[0];

    const rowElem = document.createElement("tr");
    bodyElem.appendChild(rowElem);

    for (let i = 0; i < columns; i++)
    {
      let colElem = document.createElement("td");
      rowElem.appendChild(colElem);
    }
    return rowElem;
  }

  static getNextId()
  {
    return "f" + this.nextId++;
  }

  static createComponent(type, props, ...children)
  {
    let element;
    if (typeof type === "string")
    {
      element = document.createElement(type);

      for (let name in props)
      {
        if (name.startsWith("on"))
        {
          let value = props[name];
          if (typeof value === "function")
          {
            let eventType = name.substring(2).toLowerCase();
            element.addEventListener(eventType, props[name]);
          }
          else
          {
            element.setAttribute(name, value);
          }
        }
        else
        {
          element.setAttribute(name, props[name]);
        }
      }

      for (let child of children)
      {
        if (child instanceof Array)
        {
          for (let subchild of child)
          {
            element.appendChild(subchild);
          }
        }
        else if (typeof child === "object")
        {
          element.appendChild(child);
        }
        else
        {
          element.innerHTML = child;
        }
      }
      return element;
    }
    else if (typeof type === "function")
    {
      let component = new type();
      element = component.element;
    }
    return element;
  }


/**
 * const html = Controls.template():
 *
 * const element = html`<div><h1>HOLA</h1></div>`;
 *
 * @param {function} fn
 * @returns {html components}
 */
  static template(fn = Controls.createComponent)
  {
    return htm.bind(fn);
  }
}

export { Controls };

