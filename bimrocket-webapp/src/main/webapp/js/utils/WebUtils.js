/**
 * WebUtils.js
 *
 * @author realor
 */

class WebUtils
{
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
   *
   * @param {type} tasks to execute
   * @param {type} onCompleted callback
   * @param {type} onProgress callback
   * @param {type} onError callback
   * @param {type} notifyMillis
   * @param {type} delay
   * @returns undefined
   *
   * task : { run : fn, message: string, iterations: fn }
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

        onProgress({progress : percentage, message : message});
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
              onProgress({progress : 100, message : "Completed."});
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
}

export { WebUtils };