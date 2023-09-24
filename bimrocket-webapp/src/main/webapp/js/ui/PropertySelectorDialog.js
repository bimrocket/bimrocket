/*
 * PropertySelectorDialog.js
 *
 * @author realor
 */

import { Dialog } from "./Dialog.js";
import { Controls } from "./Controls.js";
import { Tree } from "./Tree.js";
import { I18N } from "../i18n/I18N.js";

class PropertySelectorDialog extends Dialog
{
  constructor(application, options = {})
  {
    super(options.title || "title.property_selector");
    this.application = application;
    this.setI18N(this.application.i18n);

    this.setSize(700, 600);

    this.mainElem = document.createElement("div");
    this.mainElem.className = "property_selector";
    this.bodyElem.appendChild(this.mainElem);

    this.treeLabel = document.createElement("div");
    this.treeLabel.className = "label";
    I18N.set(this.treeLabel, "textContent", options.treeLabel ||
      "label.selection_by_properties");
    this.mainElem.appendChild(this.treeLabel);

    this.treeScrollElem = document.createElement("div");
    this.treeScrollElem.className = "scroll";
    this.mainElem.appendChild(this.treeScrollElem);

    this.propertyTree = new Tree(this.treeScrollElem);
    this.propertyTree.rootsElem.classList.add("tree");

    this.toolBarElem = document.createElement("div");
    this.toolBarElem.className = "property_toolbar";
    this.mainElem.appendChild(this.toolBarElem);

    this.editorView = Controls.addCodeEditor(this.mainElem, "prop_sel_editor",
      "label.expression", "", {
        "language" : "javascript",
        "height" : "80px"
      });

    this.selectValues = options.selectValues === true;
    this.findPropertiesOnSelection = options.findPropertiesOnSelection || false;
    this.isValue = false;

    this.selectedNode = null;

    this.addButton("accept", "button.accept", () =>
    {
      this.onAccept();
    });

    this.addButton("cancel", "button.cancel", () =>
    {
      this.onCancel();
    });
  }

  setCode(code)
  {
    const state = this.editorView.state;
    const tx = state.update(
      { changes: { from: 0, to: state.doc.length, insert: code } });
    this.editorView.dispatch(tx);
  }

  getCode()
  {
    return this.editorView.state.doc.toString();
  }

  appendCode(code)
  {
    const state = this.editorView.state;
    const tx = state.update(
      { changes: { from: state.doc.length, insert: code } });
    this.editorView.dispatch(tx);
    let scrollElem = this.editorView.scrollDOM.parentElement.parentElement;

    scrollElem.scrollTop = scrollElem.scrollHeight;
  }

  onShow()
  {
    this.propertyMap = this.findProperties();
    this.propertyTree.clear();
    this.updateTree(this.propertyMap, this.propertyTree);
    if (this.selectedNode)
    {
      this.selectedNode.removeClass("selected");
      this.selectedNode = null;
    }
    this.updateContextButtons();
  }

  onAccept()
  {
    this.hide();
  }

  onCancel()
  {
    this.hide();
  }

  addContextButton(name, label, action)
  {
    return Controls.addButton(this.toolBarElem, name, label, action);
  }

  updateContextButtons()
  {
  }

  getSelectedNodePath()
  {
    let path = [];
    let node = this.selectedNode;
    while (node !== null)
    {
      path.push(node.value);
      node = node.parent;
    }
    return path.reverse();
  }

  updateTree(value, node)
  {
    if (value instanceof Map)
    {
      const keys = Array.from(value.keys()).sort();
      for (let key of keys)
      {
        let subNode = node.addNode(key,
          event =>
          {
            event.preventDefault();
            this.selectNode(subNode, false);
          }, "property_set");
        let subValue = value.get(key);
        this.updateTree(subValue, subNode);
      }
    }
    else if (value instanceof Set)
    {
      const values = Array.from(value.values()).sort();
      for (let subValue of values)
      {
        let type = typeof subValue;
        if (this.selectValues)
        {
          let valueNode = node.addNode(subValue,
            event => this.selectNode(valueNode, true), type);
        }
        else
        {
          node.addNode(subValue, () => {}, type);
        }
      }
    }
  }

  findProperties()
  {
    const application = this.application;

    const roots = this.findPropertiesOnSelection ?
      application.selection.roots : [application.baseObject];

    const propertyMap = new Map();

    for (let root of roots)
    {
      root.traverse(object =>
      {
        this.addProperties(object.userData, propertyMap);
      });
    }
    return propertyMap;
  }

  addProperties(data, propertyMap)
  {
    for (let key in data)
    {
      let value = data[key];
      let type = typeof value;

      if (type === "string" || type === "number" || type === "boolean")
      {
        let valueSet = propertyMap.get(key);
        if (valueSet === undefined || !(valueSet instanceof Set))
        {
          valueSet = new Set();
          propertyMap.set(key, valueSet);
        }
        valueSet.add(value);
      }
      else if (type === "object" && value !== null)
      {
        let subPropertyMap = propertyMap.get(key);
        if (subPropertyMap === undefined || !(subPropertyMap instanceof Map))
        {
          subPropertyMap = new Map();
          propertyMap.set(key, subPropertyMap);
        }
        this.addProperties(value, subPropertyMap);
      }
    }
  }

  selectNode(node, isValue)
  {
    this.isValue = isValue;

    if (this.selectedNode)
    {
      this.selectedNode.removeClass("selected");
    }

    this.selectedNode = node;
    node.addClass("selected");

    this.updateContextButtons();
  }
}

export { PropertySelectorDialog };


