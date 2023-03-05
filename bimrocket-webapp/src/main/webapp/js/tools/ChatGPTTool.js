/*
 * ChatGPTTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { ChatGPTDialog } from "../ui/ChatGPTDialog.js";
import * as THREE from "../lib/three.module.js";

class ChatGPTTool extends Tool
{
  static API_ENDPOINT = 'https://api.openai.com/v1/completions';
  static STORAGE_KEY = "chatgpt";
  static HUMAN_STOP = "Human: ";
  static AI_STOP = "AI: ";

  constructor(application, options)
  {
    super(application);
    this.name = "chatgpt";
    this.label = "tool.chatgpt.label";
    this.className = "chatgpt";
    this.setOptions(options);
    this.createPanel();
    this.immediate = true;

    this.init();
  }

  createPanel()
  {
    this.panel = this.application.createPanel(this.label, "left", "panel_chatgpt");

    this.conversationElem = document.createElement("div");
    this.conversationElem.classList.add("conversation");
    this.panel.bodyElem.appendChild(this.conversationElem);

    this.scrollElem = document.createElement("div");
    this.scrollElem.classList.add("scroll");
    this.conversationElem.appendChild(this.scrollElem);

    this.ellipsisElem = document.createElement("div");
    this.ellipsisElem.classList.add("ellipsis_loading");
    this.ellipsisElem.textContent = "AI: ";

    this.promptElem = document.createElement("textarea");
    this.promptElem.addEventListener("focus", () => this.scrollDown());
    this.promptElem.classList.add("prompt");
    this.promptElem.spellcheck = false;
    this.panel.bodyElem.appendChild(this.promptElem);

    this.footerElem = document.createElement("div");
    this.footerElem.classList.add("footer");
    this.panel.bodyElem.appendChild(this.footerElem);

    this.sendButton = Controls.addButton(this.footerElem,
      "send", "button.send", () => this.send(), "send");

    this.deleteButton = Controls.addButton(this.footerElem,
      "delete", "button.delete", () =>
      ConfirmDialog.create("title.delete_conversation",
       "question.delete_conversation")
       .setAction(() => this.delete())
       .setAcceptLabel("button.delete")
       .setI18N(this.application.i18n).show());

    this.setupButton = Controls.addButton(this.footerElem,
      "setup", "button.setup", () => this.editSetup());
  }

  execute()
  {
    this.panel.visible = true;
  }

  init()
  {
    this.setup = null;

    let setupString = window.localStorage.getItem(ChatGPTTool.STORAGE_KEY);
    if (setupString === null)
    {
      this.setup =
      {
        api_key: "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",
        model: "text-davinci-003",
        temperature: 0.7,
        max_tokens: 256,
        training: [
          ["How are you?", "I'm fine."],
          ["Draw a line.", "@d .moveTo(0,0) .lineTo(1, 3)"],
          ["Draw a square.", "@d .moveTo(0,0) .lineTo(1, 0) .lineTo(1,1) .lineTo(0,1) .lineTo(0,0)"],
          ["Zoom all.", "@c zoom_all"],
          ["Show everything.", "@c zoom_all"],
          ["View all.", "@c zoom_all"],
          ["View top.", "@c top"],
          ["View front.", "@c front"]
        ]
      };
    }
    else
    {
      this.setup = JSON.parse(setupString);
    }
    this.delete();
  }

  send()
  {
    let prompt = this.promptElem.value;
    this.promptElem.value = "";

    this.appendInput(prompt);

    this.generateResponse(this.conversation)
      .then(response => this.processResponse(response))
      .catch(error => this.appendError(error));
  }

  delete()
  {
    this.promptElem.value = "";

    this.scrollElem.innerHTML = "";

    this.conversation = "";
    for (let pair of this.setup.training)
    {
      this.conversation += ChatGPTTool.HUMAN_STOP + pair[0];
      this.conversation += "\n";
      this.conversation += ChatGPTTool.AI_STOP + pair[1];
      this.conversation += "\n";
    }
  }

  editSetup()
  {
    const dialog = new ChatGPTDialog(this.application, this.setup);
    dialog.setSetup = setup =>
    {
      this.setup = setup;
      window.localStorage.setItem(ChatGPTTool.STORAGE_KEY, JSON.stringify(setup));
    };
    dialog.show();
  }

  async generateResponse(prompt)
  {
    const response = await fetch(ChatGPTTool.API_ENDPOINT,
    {
      method: "POST",
      headers:
      {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.setup.api_key
      },
      body: JSON.stringify(
      {
        "model": this.setup.model,
        "prompt": prompt,
        "max_tokens": this.setup.max_tokens || 256,
        "temperature" : this.setup.temperature || 0.7,
        "stop": [" " + ChatGPTTool.HUMAN_STOP, " " + ChatGPTTool.AI_STOP]
      })
    });

    const json = await response.json();
    if (json.error) throw json.error.message;

    return json.choices[0].text.trim();
  }

  processResponse(response)
  {
    this.appendOutput(response);

    if (response.startsWith(ChatGPTTool.AI_STOP))
    {
      response = response.substring(ChatGPTTool.AI_STOP.length);
    }

    if (response.startsWith("@d"))
    {
      let command = response.substring(2);
      command = "path" + command;

      let path = new THREE.Shape();
      eval(command);

      let geometry = new ProfileGeometry(path);
      let profile = new Profile(geometry);
      this.application.addObject(profile, null, false, true, this);
    }
    else if (response.startsWith("@c"))
    {
      let command = response.substring(2).trim();
      const tool = this.application.tools[command];
      if (tool)
      {
        this.application.useTool(tool);
      }
    }
  }

  appendInput(input)
  {
    const inputElem = document.createElement("div");
    inputElem.textContent = input;
    inputElem.classList.add("input");

    this.scrollElem.appendChild(inputElem);

    this.scrollElem.appendChild(this.ellipsisElem);

    this.scrollDown();

    this.conversation += ChatGPTTool.HUMAN_STOP + input + "\n";
  }

  appendOutput(output)
  {
    if (this.ellipsisElem.parentElement === this.scrollElem)
    {
      this.scrollElem.removeChild(this.ellipsisElem);
    }

    const outputElem = document.createElement("div");
    outputElem.classList.add("output");

    if (output.startsWith(ChatGPTTool.AI_STOP))
    {
      this.conversation += output + "\n";
      outputElem.textContent = output;
    }
    else
    {
      this.conversation += ChatGPTTool.AI_STOP + output + "\n";
      outputElem.textContent = ChatGPTTool.AI_STOP + output;
    }
    this.scrollElem.appendChild(outputElem);
    this.scrollDown();
  }

  appendError(error)
  {
    if (this.ellipsisElem.parentElement === this.scrollElem)
    {
      this.scrollElem.removeChild(this.ellipsisElem);
    }

    const outputElem = document.createElement("div");
    outputElem.classList.add("output");
    outputElem.classList.add("error");
    outputElem.textContent = error;

    this.scrollElem.appendChild(outputElem);
    this.scrollDown();
  }

  scrollDown()
  {
    this.scrollElem.scrollTop = this.scrollElem.scrollHeight;
  }
}

export { ChatGPTTool };
