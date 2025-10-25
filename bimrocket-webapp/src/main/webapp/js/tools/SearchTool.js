/*
 * SearchTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { I18N } from "../i18n/I18N.js";
import { Controls } from "../ui/Controls.js";
import { Tree } from "../ui/Tree.js";
import { ObjectUtils } from "../utils/ObjectUtils.js";
import * as THREE from "three";

class SearchTool extends Tool
{
  constructor(application, options)
  {
    super(application);
    this.name = "search";
    this.label = "tool.search.label";
    this.className = "search";
    this.immediate = true;
    this.materialCount = 50;
    this.setOptions(options);
    application.addTool(this);

    this.createPanel();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_search");
    this.panel.minimumHeight = 200;

    this.panel.onClose = () => this.application.useTool(null);

    this.textInput = Controls.addInputField(this.panel.bodyElem,
      "text", "text_to_find", "label.text_to_find");

    this.searchByNameCheckbox = Controls.addCheckBoxField(this.panel.bodyElem,
      "search_by_name", "label.search_by_name", true, "option_block");

    this.searchByValueCheckbox = Controls.addCheckBoxField(this.panel.bodyElem,
      "search_by_value", "label.search_by_value", true, "option_block");

    this.caseSensitiveCheckbox = Controls.addCheckBoxField(this.panel.bodyElem,
      "case_sensitive", "label.case_sensitive", false, "option_block");

    const divElem = document.createElement("div");
    divElem.className = "buttons_bar";
    this.panel.bodyElem.appendChild(divElem);

    const searchButton = Controls.addButton(divElem,
      "search", "button.search", () => this.search());

    const clearButton = Controls.addButton(divElem,
      "clear", "button.clear", () => { this.clear(); this.textInput.focus(); });

    this.textInput.addEventListener("keydown", event =>
    {
      if (event.keyCode === 13)
      {
        event.preventDefault();
        this.search();
      }
    });

    this.messageElem = document.createElement("div");
    this.panel.bodyElem.appendChild(this.messageElem);

    this.matchingsElem = document.createElement("div");
    const matchingsElem = this.matchingsElem;
    matchingsElem.className = "matchings";
    matchingsElem.style.display = "none";
    this.panel.bodyElem.appendChild(matchingsElem);

    this.tree = new Tree(matchingsElem);
    const tree = this.tree;
    tree.getNodeLabel = (group) =>
    {
      let label;
      if (group.objects)
      {
        const textToFind = this.textInput.value;
        const caseSensitive = this.caseSensitiveCheckbox.checked;
        let index;
        if (caseSensitive)
        {
          index = group.name.indexOf(textToFind);
        }
        else
        {
          index = group.name.toLowerCase().indexOf(textToFind.toLowerCase());
        }
        let endIndex = index + textToFind.length;
        let html = group.name.substring(0, index)
          + '<span class="match">' + group.name.substring(index, endIndex) + '</span>'
          + group.name.substring(endIndex)
          + " (" + group.objects.length + ")";
        label = document.createElement("div");
        label.innerHTML = html;
      }
      else
      {
        label = group.name;
      }
      return label;
    };

    this.panel.onHide = () =>
    {
      this.clear();
    };
  }

  execute()
  {
    this.panel.visible = true;
  }

  search()
  {
    const searchByName = this.searchByNameCheckbox.checked;
    const searchByValue = this.searchByValueCheckbox.checked;
    const caseSensitive = this.caseSensitiveCheckbox.checked;
    let textToFind = this.textInput.value.trim();
    let matchCount = 0;

    if (textToFind.length === 0) return;

    const matchings = { name: "ROOT", children: {} };

    if (!caseSensitive)
    {
      textToFind = textToFind.toLowerCase();
    }

    const addPath = (path, object) =>
    {
      matchCount++;
      let children = matchings.children;
      let group = null;
      let data = object.userData;
      let type = null;

      for (let i = 0; i < path.length; i++)
      {
        let key = path[i];
        group = children[key];
        data = typeof data === "object" ? data[key] : null;
        type = data === null ? "value" : typeof data;
        if (group === undefined)
        {
          group = { name: key, children: {}, type: type };
          children[key] = group;
        }
        children = group.children;
      }
      if (group.objects === undefined)
      {
        group.objects = [];
      }
      group.objects.push(object);
    };

    const addMatchingPaths = (object, data, parentPath) =>
    {
      if (data === null || typeof data !== "object") return;

      let keys = Object.keys(data);

      for (let key of keys)
      {
        let path = [...parentPath, key];
        let value = data[key];
        let type = typeof value;

        if (searchByName)
        {
          let keyCase = caseSensitive ? key : key.toLowerCase();
          if (keyCase.indexOf(textToFind) !== -1)
          {
            addPath(path, object);
          }
        }

        if (type === "object")
        {
          addMatchingPaths(object, value, path);
        }
        else if (searchByValue)
        {
          let valueCase = caseSensitive ?
            String(value) : String(value).toLowerCase();
          if (valueCase.indexOf(textToFind) !== -1)
          {
            addPath([...path, String(value)], object);
          }
        }
      }
    };

    this.application.baseObject.traverse(obj =>
    {
      addMatchingPaths(obj, obj.userData, []);
    });

    this.tree.clear();

    if (matchCount === 0)
    {
      I18N.set(this.messageElem, "textContent", "message.no_matches");
      this.matchingsElem.style.display = "none";
    }
    else
    {
      if (matchCount === 1)
      {
        I18N.set(this.messageElem, "textContent", "message.one_match");
        this.matchingsElem.style.display = "none";
      }
      else
      {
        I18N.set(this.messageElem, "textContent",
          "message.matches_count", matchCount);
      }
      this.matchingsElem.style.display = "block";
      this.createNodes(this.tree, matchings);
    }
    this.application.i18n.update(this.messageElem);
  }

  clear()
  {
    this.tree.clear();
    this.textInput.value = "";
    I18N.set(this.messageElem, "textContent", "");
    this.application.i18n.update(this.messageElem);
    this.matchingsElem.style.display = "none";
  }

  createNodes(node, group)
  {
    let children = group.children;
    let keys = Object.keys(children);
    keys.sort();
    for (let key of keys)
    {
      let subgroup = group.children[key];
      let childNode = node.addNode(subgroup, event =>
      {
        this.selectObjects(subgroup);
      }, subgroup.type);
      this.createNodes(childNode, subgroup);
      childNode.expand();
    }
  }

  selectObjects(group)
  {
    let objects = group.objects;
    if (objects)
    {
      this.application.selection.set(...objects);
    }
  }
}

export { SearchTool };

