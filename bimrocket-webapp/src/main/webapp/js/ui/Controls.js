/**
 * @author realor
 */
class Controls
{
  static addText(parent, text, className)
  {
    const textElem = document.createElement("span");
    textElem.innerHTML = text;
    if (className) textElem.className = className;

    parent.appendChild(textElem);
    return textElem;
  }

  static addCode(parent, text, className)
  {
    const textElem = document.createElement("pre");
    textElem.innerHTML = text;
    if (className) textElem.className = className;

    parent.appendChild(textElem);
    return textElem;
  }

  static addLink(parent, label, url, title, className, action)
  {
    const linkElem = document.createElement("a");
    parent.appendChild(linkElem);

    if (className) linkElem.className = className;
    if (label) linkElem.innerHTML = label;
    if (url) linkElem.href = url;
    if (title)
    {
      linkElem.title = title;
      linkElem.alt = title;
    }
    if (action)
    {
      linkElem.addEventListener("click", action, false);
    }
    return linkElem;
  }

  static addTextField(parent, name, label, value, className)
  {
    const groupElem = Controls.addField(parent, name, label, className);

    const inputElem = document.createElement("input");
    inputElem.id = name;
    inputElem.name = name;
    inputElem.type = "text";
    if (value) inputElem.value = value;
    groupElem.appendChild(inputElem);

    return inputElem;
  }

  static addPasswordField(parent, name, label, value, className)
  {
    const groupElem = Controls.addField(parent, name, label, className);

    const inputElem = document.createElement("input");
    inputElem.id = name;
    inputElem.name = name;
    inputElem.type = "password";
    if (value) inputElem.value = value;
    groupElem.appendChild(inputElem);

    return inputElem;
  }

  static addTextAreaField(parent, name, label, value, className)
  {
    const groupElem = Controls.addField(parent, name, label, className);

    const textAreaElem = document.createElement("textarea");
    textAreaElem.id = name;
    textAreaElem.name = name;
    if (value) textAreaElem.value = value;
    groupElem.appendChild(textAreaElem);

    return textAreaElem;
  }

  static addDateField(parent, name, label, value, className)
  {
    const groupElem = Controls.addField(parent, name, label, className);

    const dateElem = document.createElement("input");
    dateElem.type = "date";
    dateElem.id = name;
    dateElem.name = name;
    if (value) dateElem.value = value;
    groupElem.appendChild(dateElem);

    return dateElem;
  }

  static addSelectField(parent, name, label, options, value, className)
  {
    const groupElem = Controls.addField(parent, name, label, className);

    const selectElem = document.createElement("select");
    selectElem.id = name;
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
    if (options)
    {
      for (let i = 0; i < options.length; i++)
      {
        let option = options[i];
        let optionElem = document.createElement("option");
        if (option instanceof Array)
        {
          optionElem.value = option[0];
          optionElem.innerHTML = option[1];
        }
        else
        {
          optionElem.value = option;
          optionElem.innerHTML = option;
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
      optionElem.innerHTML = value;
      selectElem.appendChild(optionElem);
      selectElem.value = value;
    }
    else if (selectElem.options.length > 0)
    {
      // select first
      selectElem.value = selectElem.options[0].value;
    }
  }

  static addRadioButtons(parent, name, label, options, value, className)
  {
    const groupElem = Controls.addField(parent, name, label, className);

    const hiddenElem = document.createElement("input");
    hiddenElem.type = "hidden";
    groupElem.appendChild(hiddenElem);

    for (let i = 0; i < options.length; i++)
    {
      let option = options[i];

      let radioElem = document.createElement("input");
      radioElem.id = name + "_" + i;
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
        let elem = event.target || event.srcElement;
        hiddenElem.value = elem.value;
      }, false);
      groupElem.appendChild(radioElem);

      let labelElem = document.createElement("label");
      labelElem.innerHTML = option instanceof Array ? option[1] : option;
      labelElem.htmlFor = radioElem.id;
      groupElem.appendChild(labelElem);
    }
    return hiddenElem;
  }

  static addButton(parent, name, label, action, className)
  {
    const scope = this;
    const buttonElem = document.createElement("button");
    buttonElem.name = name;
    buttonElem.innerHTML = label;
    if (className) buttonElem.className = className;
    buttonElem.addEventListener("click", function(){action(scope);}, false);
    parent.appendChild(buttonElem);

    return buttonElem;
  }

  static addField(parent, name, label, className)
  {
    const groupElem = document.createElement("div");
    if (className) groupElem.className = className;
    parent.appendChild(groupElem);

    const labelElem = document.createElement("label");
    labelElem.htmlFor = name;
    labelElem.innerHTML = label;
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
        headColElem.innerHTML = columns[i];
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
};

