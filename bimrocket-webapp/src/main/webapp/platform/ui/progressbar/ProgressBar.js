/**
 * ProgressBar.js
 *
 * @author realor
 */

import { I18N } from "platform/i18n/I18N.js";

class ProgressBar
{
  constructor(parent = document.body)
  {
    this.element = document.createElement("div");
    this.element.className = "progressbar";
    parent.appendChild(this.element);

    this.messageElem = document.createElement("div");
    this.element.appendChild(this.messageElem);
    this.messageElem.className = "message";

    this.barElem = document.createElement("div");
    this.element.appendChild(this.barElem);
    this.barElem.className = "bar";

    this.doneElem = document.createElement("div");
    this.barElem.appendChild(this.doneElem);
    this.doneElem.className = "done";

    this.progressElem = document.createElement("div");
    this.progressElem.className = "progress";
    this.element.appendChild(this.progressElem);

    this.percentElem = document.createElement("span");
    this.progressElem.appendChild(this.percentElem);
    this.percentElem.className = "percent";

    this.remainingLabelElem = document.createElement("span");
    this.progressElem.appendChild(this.remainingLabelElem);
    this.remainingLabelElem.className = "remaining-label";
    I18N.set(this.remainingLabelElem, "textContent", "label.remaining_time");

    this.remainingTimeElem = document.createElement("span");
    this.progressElem.appendChild(this.remainingTimeElem);
    this.remainingTimeElem.className = "remaining-time";

    this._progress = undefined;
    this._message = null;
    this._startTime = null;
    this.visible = false;
  }

  setI18N(i18n)
  {
    this.i18n = i18n;
    return this;
  }

  get visible()
  {
    return this._visible;
  }

  set visible(value)
  {
    this._visible = value;
    this.element.style.display = value ? "" : "none";
    if (value)
    {
      this._startTime = Date.now();
      if (this.i18n)
      {
        this.i18n.update(this.remainingLabelElem);
      }
    }
  }

  get progress()
  {
    return this._progress;
  }

  set progress(progress)
  {
    this._progress = progress;
    if (typeof progress !== "number")
    {
      this.doneElem.innerHTML = "";
      this.element.classList.add("undeterminate");
      this.progressElem.style.display = "none";
    }
    else
    {
      progress = Math.round(progress);
      if (progress < 0) progress = 0;
      else if (progress > 100) progress = 100;

      this.element.classList.remove("undeterminate");
      this.doneElem.style.width = progress + "%";
      this.progressElem.style.display = "";

      this.percentElem.textContent = progress + "%";

      let remainingTime = null

      if (this._startTime !== null && progress > 0)
      {
        const elapsed = Date.now() - this._startTime;
        const totalEstimated = elapsed / (progress / 100);
        const remaining = totalEstimated - elapsed;

        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);

        const seconds = Math.floor((remaining % 60000) / 1000);
        if (hours > 0)
        {
          remainingTime = hours + "h " + minutes + "m";
        }
        else if (minutes > 0)
        {
          remainingTime = minutes + "m";
        }
        else if (seconds > 0)
        {
          remainingTime = seconds + "s";
        }
      }

      if (remainingTime)
      {
        this.remainingLabelElem.style.display = "";
        this.remainingTimeElem.textContent = remainingTime;
        this.remainingTimeElem.style.display = "";
      }
      else
      {
        this.remainingLabelElem.style.display = "none";
        this.remainingTimeElem.style.display = "none";
      }
    }
  }

  get message()
  {
    return this._message;
  }

  set message(message)
  {
    this._message = message;
    this.messageElem.textContent = message ? message : "";
  }
}

export { ProgressBar };

