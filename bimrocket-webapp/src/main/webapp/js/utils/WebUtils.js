/**
 * WebUtils.js
 *
 * @author realor
 */

class WebUtils
{
  /**
   * Describes an HTTP status code
   *
   * @param {string} status - the status code to describe
   * @returns {string} the description of the status code
   */

  static getHttpStatusMessage(status)
  {
    let message;

    switch (status)
    {
      case 200:
        message = "OK";
        break;
      case 400:
        message = "Bad request";
        break;
      case 401:
        message = "Unathorized";
        break;
      case 403:
        message = "Access forbidden";
        break;
      case 404:
        message = "Not found";
        break;
      case 405:
        message = "Not allowed";
        break;
      case 500:
        message = "Internal server error";
        break;
      case 501:
        message = "Not implemented";
        break;
      default:
        message = "";
    }
    return message;
  };

  /**
   * Sets basic authorization header to request object
   *
   * @param {object} request - the request object (XMLHttpRequest or fetch options)
   * @param {string} username - the username
   * @param {string} password - the password
   * @param {string} headerName - the header name to set (Authorization by default)
   */
  static setBasicAuthorization(request, username, password,
    headerName = "Authorization")
  {
    if (username && password)
    {
      const userPass = username + ":" + password;
      const authorization = "Basic " + btoa(userPass);

      if (request instanceof XMLHttpRequest)
      {
        request.setRequestHeader(headerName, authorization);
      }
      else if (typeof request === "object") // fetch header options
      {
        request[headerName] = authorization;
      }
    }
  }

  /**
   * Encodes text as HTML
   *
   * @param {type} text - the text to encode
   * @returns {string} the HTML encoded text
   */
  static toHTML(text)
  {
    var html = "";
    var ch, i;
    for (i = 0; i < text.length; i++)
    {
      ch = text.charAt(i);
      if (ch === '<') html += "&lt;";
      else if (ch === '>') html += "&gt;";
      else if (ch === '&') html += "&amp;";
      else html += ch;
    }
    return html;
  }

  /**
   * Executes a list of tasks without blocking the UI thread
   *
   * @param {array} tasks - the array of tasks to execute, where a task is:
   *   {
   *     "run" : function to execute, run(step),
   *     "message" : the message to show,
   *     "iterations" : function that returns the number of iterations (steps)
   *       of the task
   *   }
   * @param {function} onCompleted callback
   * @param {function} onProgress callback
   * @param {function} onError callback
   * @param {number} notifyMillis - the time between 2 progress notifications
   * @param {number} delay - the initial delay in ms
   *
   */
  static executeTasks(tasks, onCompleted, onProgress, onError,
    notifyMillis, delay)
  {
    notifyMillis = notifyMillis || 100;
    delay = delay || 10;

    var postTask = function(i, j)
    {
      var task = tasks[i];
      var iterations = task.iterations !== undefined ? task.iterations() : 1;
      var message = task.message;
      if (iterations > 1)
      {
        message += " (" + j + " / " + iterations + ")";
      }

      if (onProgress)
      {
        var taskPerc = 100.0 / tasks.length;
        var percentage = Math.round((i + (j / iterations)) * taskPerc);

        onProgress({ progress : percentage, message : message });
      }

      setTimeout(function() {

        if (iterations > 0)
        {
          var t0 = Date.now();
          do
          {
            try
            {
              task.run(j++);
            }
            catch (ex)
            {
              if (onError) onError(ex);
              return;
            }
          } while (j < iterations && Date.now() - t0 < notifyMillis)
        }

        if (j < iterations)
        {
          postTask(i, j);
        }
        else
        {
          i++;
          if (i < tasks.length)
          {
            postTask(i, 0);
          }
          else if (onCompleted)
          {
            if (onProgress)
            {
              onProgress({ progress : 100, message : "Completed." });
              setTimeout(onCompleted, 100);
            }
            else
            {
              onCompleted();
            }
          }
        }
      }, delay);
    };

    postTask(0, 0);
  }

  /**
   * Downloads a file with the specified content
   *
   * @param {string} content - the content to download
   * @param {string} filename - the name of the downloaded file
   * @param {type} contentType - the content type of the file
   */
  static downloadFile(content, filename, contentType)
  {
    filename = filename || "file";
    contentType = contentType || "application/octet-stream";

    const blob = new Blob([content], { type : contentType });
    const downloadUrl = window.URL.createObjectURL(blob);
    let linkElem = document.createElement("a");
    linkElem.download = filename;
    linkElem.target = "_blank";
    linkElem.href = downloadUrl;
    linkElem.style.display = "block";
    linkElem.addEventListener("click", event =>
    {
      setTimeout(function()
      {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1500);
    });
    linkElem.click();
    linkElem.remove();
  }
}

export { WebUtils };