/**
 * @author realor
 */
BIMROCKET.ProgressBar = class
{
  constructor(element)
  {
    this.element = element;
    this.element.className = "progress_bar";

    this.messageElem = document.createElement("div");
    this.element.appendChild(this.messageElem);
    this.messageElem.className = "message";

    this.barElem = document.createElement("div");
    this.element.appendChild(this.barElem);
    this.barElem.className = "bar";

    this.progressElem = document.createElement("div");
    this.barElem.appendChild(this.progressElem);
    this.progressElem.className = "progress";

    this.percentElem = document.createElement("div");
    this.barElem.appendChild(this.percentElem);
    this.percentElem.className = "percent";

    this._visible = false;
    this._progress = undefined;
    this._message = null;
  }

  get visible()
  {
    return this._visible;
  }
  
  set visible(value)
  {
    this._visible = value;
    this.element.style.display = value ? "block" : "none";
  }
  
  get progress()
  {
    return this._progress;
  }
  
  set progress(progress)
  {
    this._progress = progress;
    if (progress === undefined)
    {
      this.percentElem.style.display = "none";
      this.progressElem.innerHTML = "";
      this.progressElem.style.width = "100%";
      this.progressElem.classList.add("undeterminate");
    }
    else
    {
      progress = Math.round(progress);
      this.progressElem.classList.remove("undeterminate");
      this.progressElem.style.width = progress + "%";
      this.percentElem.style.display = "block";
      this.percentElem.innerHTML = progress + "%";
    }
  }

  get message()
  {
    return this._message;
  }
  
  set message(message)
  {
    this._message = message;
    this.messageElem.innerHTML = message ? message : "";
  }
};

