/**
 * Utils.js
 *
 * @author realor
 */
function getQueryParams()
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
};

function toHTML(text)
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
};

// task : { run : fn, message: string, iterations: fn }
function executeTasks(tasks, onCompleted, onProgress, onError, 
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
};
