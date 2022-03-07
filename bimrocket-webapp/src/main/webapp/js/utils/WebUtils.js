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

  static setBasicAuthorization(request, username, password)
  {
    if (username !== null && username.length > 0
        && password !== null && password.length > 0)
    {
      const userPass = username + ":" + password;
      request.setRequestHeader("Authorization", "Basic " + btoa(userPass));
    }
  }

  static getQueryParams()
  {
    var queryString = {};
    var query = window.location.search.substring(1);
    var pairs = query.split("&");
    for (var i = 0; i < pairs.length; i++)
    {
      var index = pairs[i].indexOf("=");
      if (index !== -1)
      {
        var name = decodeURIComponent(pairs[i].substring(0, index));
        var value = decodeURIComponent(pairs[i].substring(index + 1));
        if (typeof queryString[name] === "undefined")
        {
          queryString[name] = value;
        }
        else if (typeof queryString[name] === "string")
        {
          var arr = [queryString[name], value];
          queryString[name] = arr;
        }
        else
        {
          queryString[name].push(value);
        }
      }
    }
    return queryString;
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
      var iterations = task.iterations ? task.iterations() : 1;
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