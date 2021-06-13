/*
 * Toast.js
 *
 * author: realor
 */

BIMROCKET.Toast = class
{
  constructor(message, width, height)
  {
    this.toastElem = document.createElement("div");
    this.toastElem.className = "toast";
    this.toastElem.style.position = "absolute";
    this.toastElem.style.width = width + "px";
    this.toastElem.style.height = height + "px";
    this.toastElem.style.left = "50%";
    this.toastElem.style.marginLeft = "-" + (width / 2) + "px";
    this.toastElem.style.top = "50px";
    this.toastElem.innerHTML = message;
    this.toastElem.style.opacity = 0;
  }

  static show(message, millis = 2000)
  {
    let toast = new BIMROCKET.Toast(message, 200, 40);
    toast.show();
    setTimeout(() => toast.hide(), 500 + millis);
  }
  
  show()
  {
    if (!this.toastElem.parentNode)
    {
      document.body.appendChild(this.toastElem);
      setTimeout(() => this.toastElem.style.opacity = 1, 500);
    }
  }

  hide()
  {
    this.toastElem.style.opacity = 0;
    setTimeout(() => 
    {
      let parentNode = this.toastElem.parentNode;
      if (parentNode)
      {
        parentNode.removeChild(this.toastElem);
      }
    }, 1000);
  }
};
