/**
 * Auth.js
 *
 * @author alexis-i2cat
 * @author realor
 */

export class Auth
{
  static openAuthPopup(authUrl)
  {
    const popupWidth = Math.min(900, window.innerWidth - 20);
    const popupHeight = Math.min(700, window.innerHeight - 20);

    const left = window.screenX + (window.innerWidth - popupWidth) / 2;
    const top = window.screenY + (window.innerHeight - popupHeight) / 2;

    const options =
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`;

    return window.open(authUrl, "authPopup", options);
  }
}


