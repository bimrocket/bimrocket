/*
 * ChatGPTTool.js
 *
 * @author realor
 */

import { Tool } from "./Tool.js";
import { Controls } from "../ui/Controls.js";
import { Profile } from "../core/Profile.js";
import { ProfileGeometry } from "../core/ProfileGeometry.js";
import { ChatGPTDialog } from "../ui/ChatGPTDialog.js";
import { Environment } from "../Environment.js";
import * as THREE from "three";

class ChatGPTTool extends Tool
{
  static API_ENDPOINT = "https://api.openai.com/v1/chat/completions";
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
    application.addTool(this);
    this.immediate = true;

    this.createPanel();
    this.messages = [];

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
    this.promptElem.name = "chatgpt_prompt";
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
    const application = this.application;
    this.setup = null;

    let setupString = application.setup.getItem(ChatGPTTool.STORAGE_KEY);
    if (setupString === null)
    {
      this.setup =
      {
        api_url: (Environment.SERVER_URL || "/bimrocket-server") + "/api/proxy?url=@chatgpt",
        api_key: "implicit",
        model: "gpt-4-turbo",
        temperature: 0.7,
        max_tokens: 256,
        training: [
          ["You are translating natural language instructions to commands. Next are some translation examples.", "Ok."],
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

    this.generateResponse()
      .then(response => this.processResponse(response))
      .catch(error => this.appendError(error));
  }

  delete()
  {
    this.promptElem.value = "";

    this.scrollElem.innerHTML = "";

    this.messages = [];
    const messages = this.messages;

    for (const pair of this.setup.training)
    {
      messages.push({
        "role": "user",
        "content": pair[0]
      });
      messages.push({
        "role": "system",
        "content": pair[1]
      });
    }
  }

  editSetup()
  {
    const application = this.application;
    const dialog = new ChatGPTDialog(application, this.setup);
    dialog.setSetup = setup =>
    {
      this.setup = setup;
      application.setup.setItem(ChatGPTTool.STORAGE_KEY, JSON.stringify(setup));
    };
    dialog.show();
  }

  async generateResponse()
  {
    const response = await fetch(this.setup.api_url || ChatGPTTool.API_ENDPOINT,
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
        "messages": this.messages,
        "max_tokens": this.setup.max_tokens || 256,
        "temperature" : this.setup.temperature || 0.7
      })
    });

    const text = await response.text();
    let json;
    try
    {
      json = JSON.parse(text);
    }
    catch (ex)
    {
      // not a json response
      throw text;
    }
    if (json.error) throw json.error.message;

    const message = json.choices[0].message;

    this.messages.push(message);

    return message.content;
  }

  processResponse(response)
  {
    this.appendOutput(response);

    let index = response.indexOf("@d ");

    if (index !== -1)
    {
      let command = response.substring(index + 2);
      command = "path" + command;

      let path = new THREE.Shape();
      eval(command);

      let geometry = new ProfileGeometry(path);
      let profile = new Profile(geometry);
      this.application.addObject(profile, null, false, true, this);
    }
    else
    {
      index = response.indexOf("@c ");

      if (index !== -1)
      {
        let command = response.substring(index + 2).trim();
        const tool = this.application.tools[command];
        if (tool)
        {
          this.application.useTool(tool);
        }
      }
    }
  }

  appendInput(input)
  {
    const inputElem = document.createElement("div");
    inputElem.textContent = ChatGPTTool.HUMAN_STOP + input;
    inputElem.classList.add("input");

    this.scrollElem.appendChild(inputElem);

    this.scrollElem.appendChild(this.ellipsisElem);

    this.scrollDown();

    this.messages.push({
      "role" : "user",
      "content" : input
    });
  }

  appendOutput(output)
  {
    if (this.ellipsisElem.parentElement === this.scrollElem)
    {
      this.scrollElem.removeChild(this.ellipsisElem);
    }

    const outputElem = document.createElement("div");
    outputElem.classList.add("output");
    outputElem.textContent = ChatGPTTool.AI_STOP + output;

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
