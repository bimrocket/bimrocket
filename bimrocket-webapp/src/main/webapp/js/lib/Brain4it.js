/* Brain4it.js */

if (typeof Brain4it === "undefined")
{
  var Brain4it = {};
}

Brain4it.idSequence = 0;

/* Reference class */

Brain4it.Reference = function(name)
{
  this.name = name;
};

/* Structure class */

Brain4it.Structure = function(size)
{
  this.id = String(Brain4it.idSequence++);
  this.namesList = [];
  this.nameToIndexMap = {};
  this.shared = false;
  if (size !== undefined)
  {
    for (var i = 0; i < size; i++)
    {
      this.namesList.push(null);
    }
  }
};

Brain4it.Structure.prototype =
{
  size : function()
  {
    return this.namesList.length;
  },

  isShared : function()
  {
    return this.shared;
  },

  setShared : function(shared)
  {
    this.shared = shared;
  },

  add : function()
  {
    this.namesList.push(null);
  },

  insert : function(index)
  {
    this.shiftIndices(index, 1);
    this.namesList.splice(index, 0, null);
  },

  delete : function(index)
  {
    this.shiftIndices(index, -1);
    this.namesList.splice(index, 1);
  },

  putName : function(index, name)
  {
    if (index === this.namesList.length)
    {
      this.nameToIndexMap[name] = index;
      this.namesList.push(name);
    }
    else if (index < this.namesList.length)
    {
      var oldName = this.namesList[index];
      if (oldName !== null)
      {
        delete this.nameToIndexMap[oldName];
      }
      if (name !== null)
      {
        var oldIndex = this.nameToIndexMap[name];
        this.nameToIndexMap[name] = index;
        if (oldIndex !== null)
        {
          this.namesList[oldIndex] = null;
        }
      }
      this.namesList[index] = name;
    }
    else throw "invalid index";
  },

  getName : function(index)
  {
    return this.namesList[index];
  },

  deleteName : function(index)
  {
    this.putName(index, null);
  },

  getIndex : function(name)
  {
    var index = this.nameToIndexMap[name];
    return index === undefined ? -1 : index;
  },

  clone : function()
  {
    var structure = new Brain4it.Structure();
    for (var key in this.nameToIndexMap)
    {
      structure.nameToIndexMap[key] = this.nameToIndexMap[key];
    }
    for (var index = 0; index < this.namesList.length; index++)
    {
      structure.namesList.push(this.namesList[index]);
    }
    return structure;
  },

  shiftIndices : function(index, offset)
  {
    if (offset < 0)
    {
      var name = this.namesList[index];
      if (name !== null)
      {
        delete this.nameToIndexMap[name];
      }
      index++;
    }
    while (index < this.namesList.length)
    {
      var name = this.namesList[index];
      if (name !== null)
      {
        this.nameToIndexMap[name] = index + offset;
      }
      index++;
    }
  }
};

/* List class */

Brain4it.List = function()
{
  this.id = String(Brain4it.idSequence++);
  this.elements = [];
  this.structure = null;
};

Brain4it.List.prototype =
{
  getStructure : function()
  {
    return this.structure;
  },

  setStructure : function(structure)
  {
    structure.setShared(true);
    this.structure = structure;

    if (this.elements.length > structure.size())
    {
      this.elements.splice(structure.size(),
        this.elements.length - structure.size());
    }
    else if (this.elements.length < structure.size())
    {
      for (var i = this.elements.length; i < structure.size(); i++)
      {
        this.elements.push(null);
      }
    }
  },

  add : function(element)
  {
    if (this.structure !== null)
    {
      this.modifyStructure();
      this.structure.add();
    }
    this.elements.push(element);
  },

  insert : function(index, element)
  {
    if (this.structure !== null)
    {
      this.modifyStructure();
      this.structure.insert(index);
    }
    this.elements.splice(index, 0, element);
  },

  size : function()
  {
    return this.elements.length;
  },

  putByName : function(name, element)
  {
    var old;
    var index;
    if (this.structure === null)
    {
      this.structure = new Brain4it.Structure(this.elements.length);
      index = -1;
    }
    else
    {
      index = this.structure.getIndex(name);
    }

    if (index === -1)
    {
      this.modifyStructure();
      this.structure.putName(this.elements.length, name);
      this.elements.push(element);
      old = null;
    }
    else
    {
      old = this.elements[index];
      this.elements[index] = element;
    }
    return old;
  },

  getByName : function(name)
  {
    if (this.structure !== null)
    {
      var index = this.structure.getIndex(name);
      if (index !== -1) return this.elements[index];
    }
    return null;
  },

  removeByName : function(name)
  {
    if (this.structure === null) return null;
    var index = this.structure.getIndex(name);
    if (index === -1) return null;
    return this.removeByIndex(index);
  },

  putByIndex : function(index, element)
  {
    var old = this.elements[index];
    this.elements[index] = element;
    return old;
  },

  getByIndex : function(index)
  {
    return this.elements[index];
  },

  removeByIndex : function(index)
  {
    if (this.structure !== null)
    {
      this.modifyStructure();
      this.structure.delete(index);
    }
    var old = this.elements[index];
    this.elements.splice(index, 1);
    return old;
  },

  putName : function(index, name)
  {
    if (this.structure === null)
    {
      if (name === null) return;
      this.structure = new Brain4it.Structure();
    }
    else
    {
      this.modifyStructure();
    }
    this.structure.putName(index, name);
  },

  getName : function(index)
  {
    if (this.structure === null) return null;
    return this.structure.getName(index);
  },

  has : function(name)
  {
    if (this.structure === null) return false;
    return this.structure.getIndex(name) !== -1;
  },

  getIndexOfName : function(name)
  {
    if (this.structure === null) return -1;
    return this.structure.getIndex(name);
  },

  modifyStructure : function()
  {
    if (this.structure.isShared())
    {
      this.structure = this.structure.clone();
    }
  }
};

/* IO classes */

Brain4it.OPEN_LIST_TOKEN = "(";
Brain4it.CLOSE_LIST_TOKEN = ")";
Brain4it.NAME_OPERATOR_TOKEN = "=>";
Brain4it.PATH_REFERENCE_SEPARATOR = "/";

Brain4it.DECLARATION_TAG_PREFIX = "<#";
Brain4it.DECLARATION_TAG_SUFFIX = ">";
Brain4it.DECLARATION_TAG_SEPARATOR = ":";

Brain4it.LINK_TAG_PREFIX = "<@";
Brain4it.LINK_TAG_SUFFIX = ">";

/* ServerConstants */

Brain4it.MIMETYPE = "text/plain";
Brain4it.CHARSET = "UTF-8";

Brain4it.ACCESS_KEY_HEADER = "access-key";
Brain4it.MONITOR_HEADER = "monitor";
Brain4it.SESSION_ID_HEADER = "session-id";
Brain4it.SERVER_TIME_HEADER = "server-time";

Brain4it.MODULE_ACCESS_KEY_VAR = "access-key";
Brain4it.MODULE_METADATA_VAR = "module-metadata";
Brain4it.DASHBOARDS_FUNCTION_NAME = "@dashboards";

Brain4it.unescapeString = function(text)
{
  var escape = false;
  var buffer = "";
  for (var i = 0; i < text.length; i++)
  {
    var ch = text.charAt(i);
    if (escape)
    {
      switch (ch)
      {
        case 'n': buffer += '\n'; break;
        case 'r': buffer += '\r'; break;
        case 't': buffer += '\t'; break;
        case '\\': buffer += '\\'; break;
        case 'b': buffer += '\b'; break;
        case 'f': buffer += '\f'; break;
        case '\'': buffer += '\''; break;
        case '"': buffer += '"'; break;
        case 'u':
          var unicodeBuffer = text.substring(i + 1, i + 5);
          buffer += String.fromCharCode(parseInt(unicodeBuffer, 16));
          break;
        default:
          throw new "Invalid character: \\" + ch;
      }
      escape = false;
    }
    else if (ch === '"')
    {
    }
    else if (ch === '\\')
    {
      escape = true;
    }
    else
    {
      buffer += ch;
    }
  }
  return buffer;
};

Brain4it.escapeString = function(text)
{
  if (text === null) return "null";
  var buffer = "";
  for (var i = 0; i < text.length; i++)
  {
    var ch = text.charAt(i);
    if (ch === '\n') buffer += "\\n";
    else if (ch === '\r') buffer += "\\r";
    else if (ch === '\t') buffer += "\\t";
    else if (ch === '\\') buffer += "\\\\";
    else if (ch === '"') buffer += "\\\"";
    else buffer += ch;
  }
  return buffer;
};

Brain4it.isNumber = function(value)
{
  if (typeof value === "number")
  {
    return true;
  }
  else if (typeof value === "string" && value.length > 0)
  {
    return String(Number(value)) !== "NaN";
  }
};

Brain4it.mayBeNumber = function(value)
{
  if (typeof value === "number")
  {
    return true;
  }
  else if (typeof value === "string" && value.length > 0)
  {
    var firstChar = value.charAt(0);
    if (firstChar >= '0' && firstChar <= '9') return true;
    if (value.length === 1) return false;

    if (firstChar === '.')
    {
      var secondChar = value.charAt(1);
      return secondChar >= '0' && secondChar <= '9';
    }
    else if (firstChar === '+' || firstChar === '-')
    {
      var secondChar = value.charAt(1);
      if (secondChar >= '0' && secondChar <= '9') return true;
      if (value.length === 2) return false;
      if (secondChar === '.')
      {
        var thirdChar = value.charAt(2);
        return thirdChar >= '0' && thirdChar <= '9';
      }
    }
  }
  return false;
};

Brain4it.DECLARATION_TAG_REGEX =
  new RegExp(Brain4it.DECLARATION_TAG_PREFIX + "..*" +
             Brain4it.DECLARATION_TAG_SUFFIX);

Brain4it.LINK_TAG_REGEX =
  new RegExp(Brain4it.LINK_TAG_PREFIX + "..*" + Brain4it.LINK_TAG_SUFFIX);

Brain4it.parseTag = function(text)
{
  if (Brain4it.LINK_TAG_REGEX.test(text))
  {
    return new Brain4it.LinkTag(text.substring(
      Brain4it.LINK_TAG_PREFIX.length,
      text.length - Brain4it.LINK_TAG_SUFFIX.length));
  }
  else if (Brain4it.DECLARATION_TAG_REGEX.test(text))
  {
    var index = text.indexOf(Brain4it.DECLARATION_TAG_SEPARATOR,
      Brain4it.DECLARATION_TAG_PREFIX.length);
    if (index === -1)
    {
      return new Brain4it.DeclarationTag(text.substring(
        Brain4it.DECLARATION_TAG_PREFIX.length,
        text.length - Brain4it.DECLARATION_TAG_SUFFIX.length));
    }
    else if (index === Brain4it.DECLARATION_TAG_PREFIX.length)
    {
      return new Brain4it.DeclarationTag(null, text.substring(
        index + 1,
        text.length - Brain4it.DECLARATION_TAG_SUFFIX.length));
    }
    else
    {
      return new Brain4it.DeclarationTag(
        text.substring(Brain4it.DECLARATION_TAG_PREFIX.length, index),
        text.substring(
          index + 1,
          text.length - Brain4it.DECLARATION_TAG_SUFFIX.length));
    }
  }
  return null;
};

/* DeclarationTag class */

Brain4it.DeclarationTag = function(dataListId, structureListId)
{
  this.dataListId = dataListId ? String(dataListId) : null;
  this.structureListId = structureListId ? String(structureListId) : null;
};

Brain4it.DeclarationTag.prototype =
{
  toString : function()
  {
    var buffer = "";
    buffer += Brain4it.DECLARATION_TAG_PREFIX;
    if (this.dataListId !== null)
    {
      buffer += this.dataListId;
    }
    if (this.structureListId !== null &&
        this.structureListId !== this.dataListId)
    {
      buffer += Brain4it.DECLARATION_TAG_SEPARATOR;
      buffer += this.structureListId;
    }
    buffer += Brain4it.DECLARATION_TAG_SUFFIX;
    return buffer;
  }
};

/* LinkTag class */

Brain4it.LinkTag = function(dataListId)
{
  this.dataListId = dataListId ? String(dataListId) : null;
};

Brain4it.LinkTag.prototype =
{
  toString : function()
  {
    return Brain4it.LINK_TAG_PREFIX +
           this.dataListId +
           Brain4it.LINK_TAG_SUFFIX;
  }
};

/* Token class */

Brain4it.Token = function()
{
  this.type = null;
  this.text = null;
  this.startPosition = 0;
  this.endPosition = 0;
  this.object = null;
};

Brain4it.Token.EOF = "EOF";
Brain4it.Token.NULL = "NULL";
Brain4it.Token.NUMBER = "NUMBER";
Brain4it.Token.STRING = "STRING";
Brain4it.Token.BOOLEAN = "BOOLEAN";
Brain4it.Token.REFERENCE = "REFERENCE";
Brain4it.Token.OPEN_LIST = "OPEN_LIST";
Brain4it.Token.CLOSE_LIST = "CLOSE_LIST";
Brain4it.Token.NAME_OPERATOR = "NAME_OPERATOR";
Brain4it.Token.TAG = "TAG";
Brain4it.Token.INVALID = "INVALID";

Brain4it.Token.prototype =
{
  length : function()
  {
    return this.endPosition - this.startPosition;
  }
};

/* Tokenizer class */

Brain4it.Tokenizer = function(stream)
{
  this.stream = stream;
  this.charPosition = -1;
  this.tokens = null; // token stack
};

Brain4it.Tokenizer.prototype =
{
  readToken : function(token)
  {
    if (this.tokens === null || this.tokens.length === 0)
    {
      token = this.readNextToken(token);
    }
    else
    {
      token = this.tokens.pop();
    }
    return token;
  },

  unreadToken : function(token)
  {
    if (this.tokens === null)
    {
      this.tokens = [];
    }
    this.tokens.push(token);
  },

  readNextToken : function(token)
  {
    if (token)
    {
      token.type = null;
      token.text = null;
      token.object = null;
      token.startPosition = this.charPosition;
    }
    else
    {
      token = new Brain4it.Token();
    }
    var state = 0;
    var buffer = "";
    var pathBuffer = "";
    var end = false;

    do
    {
      var ch = this.readChar();

      switch (state)
      {
        case 0: // Expecting new token
          if (ch === null)
          {
            token.startPosition = this.charPosition;
            token.endPosition = this.charPosition;
            token.type = Brain4it.Token.EOF;
            token.text = "";
            this.unreadChar();
            end = true;
          }
          else if (ch === Brain4it.OPEN_LIST_TOKEN)
          {
            token.startPosition = this.charPosition;
            token.endPosition = this.charPosition + 1;
            token.type = Brain4it.Token.OPEN_LIST;
            token.text = Brain4it.OPEN_LIST_TOKEN;
            end = true;
          }
          else if (ch === Brain4it.CLOSE_LIST_TOKEN)
          {
            token.startPosition = this.charPosition;
            token.endPosition = this.charPosition + 1;
            token.type = Brain4it.Token.CLOSE_LIST;
            token.text = Brain4it.CLOSE_LIST_TOKEN;
            end = true;
          }
          else if (this.isSeparator(ch))
          {
            // skip
          }
          else if (ch === '"') // start STRING
          {
            buffer += ch;
            token.startPosition = this.charPosition;
            state = 1;
          }
          else if (ch === Brain4it.PATH_REFERENCE_SEPARATOR)
          {
            pathBuffer += ch;
            buffer = "";
            token.type = Brain4it.Token.REFERENCE;
            token.startPosition = this.charPosition;
            token.object = new Brain4it.List();
            state = 3;
          }
          else // start NUMBER, BOOLEAN, NULL or REFERENCE
          {
            buffer += ch;
            token.startPosition = this.charPosition;
            state = 2;
          }
          break;

        case 1: // Processing String
          if (ch === null)
          {
            // unterminated string
            token.endPosition = this.charPosition;
            token.type = Brain4it.Token.INVALID;
            try
            {
              token.object = Brain4it.unescapeString(buffer);
            }
            catch (ex)
            {
            }
            token.text = buffer;
            end = true;
          }
          else if (ch === '\n' || ch === '\r' || ch === '\t')
          {
            token.endPosition = this.charPosition + 1;
            token.type = Brain4it.Token.INVALID;
            try
            {
              token.object = Brain4it.unescapeString(buffer);
            }
            catch (ex)
            {
            }
            token.text = buffer;
            this.unreadChar();
            end = true;
          }
          else if (ch === '"' && buffer.charAt(buffer.length - 1) !== '\\')
          {
            buffer += ch;
            token.endPosition = this.charPosition + 1;
            token.type = Brain4it.Token.STRING;
            try
            {
              token.object = Brain4it.unescapeString(buffer);
            }
            catch (ex)
            {
              token.type = Brain4it.Token.INVALID;
            }
            token.text = buffer;
            end = true;
          }
          else
          {
            buffer += ch;
          }
          break;

        case 2: // Processing token
          if (this.isSeparator(ch) ||
              ch === Brain4it.OPEN_LIST_TOKEN ||
              ch === Brain4it.CLOSE_LIST_TOKEN ||
              ch === null)
          {
            if (token.type === Brain4it.Token.INVALID)
            {
              // return INVALID token
            }
            else if (buffer === "true")
            {
              token.type = Brain4it.Token.BOOLEAN;
              token.object = true;
            }
            else if (buffer === "false")
            {
              token.type = Brain4it.Token.BOOLEAN;
              token.object = false;
            }
            else if (buffer === "null")
            {
              token.type = Brain4it.Token.NULL;
            }
            else if (buffer === "NaN")
            {
              token.type = Brain4it.Token.NUMBER;
              token.object = NaN;
            }
            else if (buffer === "Infinity")
            {
              token.type = Brain4it.Token.NUMBER;
              token.object = Infinity;
            }
            else if (buffer === "-Infinity")
            {
              token.type = Brain4it.Token.NUMBER;
              token.object = -Infinity;
            }
            else if (Brain4it.mayBeNumber(buffer))
            {
              try
              {
                token.object = Number(buffer);
                token.type = Brain4it.Token.NUMBER;
              }
              catch (ex)
              {
                token.type = Brain4it.Token.INVALID;
              }
            }
            else
            {
              var tag = Brain4it.parseTag(buffer);
              if (tag !== null)
              {
                token.object = tag;
                token.type = Brain4it.Token.TAG;
              }
              else
              {
                token.type = Brain4it.Token.REFERENCE;
              }
            }
            token.text = buffer;
            token.endPosition = this.charPosition;
            this.unreadChar();
            end = true;
          }
          else if (ch === '"')
          {
            buffer += ch;
            token.type = Brain4it.Token.INVALID;
          }
          else if (ch === Brain4it.PATH_REFERENCE_SEPARATOR)
          {
            token.type = Brain4it.Token.REFERENCE;
            token.object = new Brain4it.List();
            this.unreadChar();
            state = 3;
          }
          else
          {
            // add char to token
            buffer += ch;
            if (buffer === Brain4it.NAME_OPERATOR_TOKEN)
            {
              token.object = null;
              token.type = Brain4it.Token.NAME_OPERATOR;
              token.endPosition = this.charPosition + 1;
              token.text = Brain4it.NAME_OPERATOR_TOKEN;
              end = true;
            }
          }
          break;
        case 3: // path reference name or index
          if (this.isSeparator(ch) ||
              ch === Brain4it.OPEN_LIST_TOKEN ||
              ch === Brain4it.CLOSE_LIST_TOKEN ||
              ch === Brain4it.PATH_REFERENCE_SEPARATOR ||
              ch === null)
          {
            pathBuffer += buffer;
            if (buffer.length > 0)
            {
              if (buffer[0] >= '0' && buffer[0] <= '9')
              {
                try
                {
                  token.object.add(parseInt(buffer));
                }
                catch (ex)
                {
                  token.object.add(buffer);
                  token.type = Brain4it.Token.INVALID;
                }
              }
              else
              {
                if (buffer[0] === '"' && buffer[buffer.length - 1] === '"')
                {
                  try
                  {
                    token.object.add(Brain4it.unescapeString(buffer));
                  }
                  catch (ex)
                  {
                    token.object.add(buffer);
                    token.type = Brain4it.Token.INVALID;
                  }
                }
                else
                {
                  token.object.add(buffer);
                  if (buffer.indexOf('"') !== -1)
                  {
                    token.type = Brain4it.Token.INVALID;
                  }
                }
              }
            }
            if (ch === Brain4it.PATH_REFERENCE_SEPARATOR)
            {
              pathBuffer += ch;
              buffer = "";
            }
            else
            {
              token.endPosition = this.charPosition;
              token.text = pathBuffer;
              if (token.object instanceof Brain4it.List)
              {
                if (token.object.size() === 0)
                {
                  token.object = null;
                }
              }
              this.unreadChar(ch);
              end = true;
            }
          }
          else if (ch === '"')
          {
            buffer += ch;
            state = 4;
          }
          else
          {
            buffer += ch;
          }
          break;
        case 4: // path reference name string
          if (ch === null)
          {
            // unterminated string
            pathBuffer += buffer;
            token.endPosition = this.charPosition;
            token.type = Brain4it.Token.INVALID;
            token.text = pathBuffer;
            end = true;
          }
          else if (ch === '\n' || ch === '\r' || ch === '\t')
          {
            pathBuffer += buffer;
            token.endPosition = this.charPosition + 1;
            token.type = Brain4it.Token.INVALID;
            token.text = pathBuffer;
            this.unreadChar(ch);
            end = true;
          }
          else if (ch === '"' && buffer[buffer.length - 1] !== '\\')
          {
            buffer += ch;
            state = 3;
          }
          else
          {
            buffer += ch;
          }
        default:
      }
    }
    while (!end);
    return token;
  },

  readChar : function()
  {
    this.charPosition++;
    if (this.charPosition >= this.stream.length) return null;
    var ch = this.stream.charAt(this.charPosition);
    return ch;
  },

  unreadChar : function()
  {
    if (this.charPosition >= 0)
    {
      this.charPosition--;
    }
  },

  isSeparator : function(ch)
  {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  }
};

/* Parser class */

Brain4it.Parser = function()
{
  this.tokenizer = null;
  this.listsById = null;
  this.structuredLists = null;
  this.stack = null;
  this.name = null;
};

Brain4it.Parser.prototype =
{
  parse : function(text)
  {
    this.tokenizer = new Brain4it.Tokenizer(text);
    this.listsById = {};
    this.structuredLists = {};
    this.stack = [];
    this.name = null;

    var result = null;
    var token = new Brain4it.Token();

    this.tokenizer.readToken(token);
    var end = false;
    do
    {
      if (token.type === Brain4it.Token.INVALID)
      {
        throw "Invalid token: " + token.text + " at " + token.startPosition;
      }
      else if (token.type === Brain4it.Token.OPEN_LIST)
      {
        var list = new Brain4it.List();
        if (this.stack.length === 0)
        {
          result = list;
        }
        else
        {
          this.addToCurrentList(list);
        }
        this.stack.push(list);
      }
      else if (token.type === Brain4it.Token.CLOSE_LIST)
      {
        if (this.stack.length > 0)
        {
          this.stack.pop();
          if (this.stack.length === 0)
          {
            end = true;
          }
        }
        else throw "Unmatched parentheses at " + token.startPosition;
      }
      else if (token.type === Brain4it.Token.NAME_OPERATOR)
      {
        if (this.stack.length === 0)
          throw "Missing name at " + token.startPosition;

        var currentList = this.stack[this.stack.length - 1];
        if (currentList.size() === 0)
          throw "Missing name at " + token.startPosition;

        var nameObject = currentList.removeByIndex(currentList.size() - 1);
        if (nameObject instanceof Brain4it.Reference)
        {
          this.name = nameObject.name;
        }
        else
        {
          this.name = String(nameObject);
        }
      }
      else if (token.type === Brain4it.Token.TAG)
      {
        if (this.stack.length === 0)
        {
          throw "Invalid tag at " + token.startPosition;
        }
        else
        {
          var tag = token.object;
          var currentList = this.stack[this.stack.length - 1];
          if (tag instanceof Brain4it.DeclarationTag)
          {
            var dataListId = tag.dataListId;
            if (dataListId !== null)
            {
              this.listsById[dataListId] = currentList;
            }
            var structureListId = tag.structureListId;
            if (structureListId !== null)
            {
              var list = this.listsById[structureListId];
              if (list === null)
              {
                throw new "Invalid declaration tag at " +
                  token.startPosition;
              }
              this.structuredLists[currentList.id] =
                [currentList, list.getStructure()];
            }
          }
          else // LinkTag
          {
            var dataListId = tag.dataListId;
            var list = this.listsById[dataListId];
            if (list === null)
              throw "Invalid link tag at " + token.startPosition;
            this.addToCurrentList(list);
          }
        }
      }
      else if (token.type === Brain4it.Token.REFERENCE)
      {
        var reference = new Brain4it.Reference(token.text);
        if (this.stack.length === 0)
        {
          result = reference;
          end = true;
        }
        else
        {
          this.addToCurrentList(reference);
        }
      }
      else // Literals
      {
        var object = token.object;
        if (this.stack.length === 0)
        {
          result = object;
          end = true;
        }
        else // add to current list
        {
          this.addToCurrentList(object);
        }
      }
      this.tokenizer.readToken(token);
    }
    while (token.type !== Brain4it.Token.EOF && !end);

    if (!(end && token.type === Brain4it.Token.EOF))
      throw "Unmatched parenthesis at " + token.startPosition;

    for (var listId in this.structuredLists)
    {
      var pair = this.structuredLists[listId];
      var list = pair[0];
      var structure = pair[1];
      list.setStructure(structure);
    }
    return result;
  },

  addToCurrentList : function(object)
  {
    var currentList = this.stack[this.stack.length - 1];
    if (this.name === null || this.structuredLists[currentList.id])
    {
      currentList.add(object);
    }
    else
    {
      currentList.putByName(this.name, object);
    }
    this.name = null;
  }
};

/* Printer class */

Brain4it.Printer = function()
{
  this.output = null;
  this.cursorStack = null;
  this.dataRegistry = null;
  this.structureRegistry = null;
  this.addSpace = true;
  this.anchorCount = 0;
};

Brain4it.Printer.prototype =
{
  print : function(object)
  {
    this.createAnchorMap(object);

    this.cursorStack = [];

    this.output = [];

    if (object instanceof Brain4it.List)
    {
      var list = object;
      this.writeListStart(this.getTag(list));
      var cursor = new Brain4it.Printer.Cursor(list);
      this.cursorStack.push(cursor);

      while (this.cursorStack.length > 0)
      {
        cursor = this.cursorStack.pop();
        while (cursor.hasNext())
        {
          var name = cursor.getName();
          var element = cursor.getElement();
          cursor.next();

          if (this.addSpace)
          {
            this.output.push(' ');
          }
          else
          {
            this.addSpace = true;
          }

          if (name !== null)
          {
            this.writeName(name);
          }
          if (element instanceof Brain4it.List)
          {
            list = element;
            var tag = this.getTag(list);
            if (tag instanceof Brain4it.LinkTag)
            {
              this.output.push(tag.toString());
            }
            else
            {
              this.cursorStack.push(cursor);
              this.writeListStart(tag);
              cursor = new Brain4it.Printer.Cursor(list);
            }
          }
          else
          {
            this.writeNonList(element);
          }
        }
        this.writeListEnd();
      }
    }
    else
    {
      this.writeNonList(object);
    }
    return this.output.join("");
  },

  writeName : function(name)
  {
    this.output.push('"');
    this.output.push(Brain4it.escapeString(name));
    this.output.push('" ');
    this.output.push(Brain4it.NAME_OPERATOR_TOKEN);
    this.output.push(" ");
  },

  writeListStart: function(tag)
  {
    this.output.push(Brain4it.OPEN_LIST_TOKEN);
    if (tag !== null)
    {
      this.output.push(tag.toString());
    }
    else
    {
      this.addSpace = false;
    }
  },

  writeListEnd : function()
  {
    this.output.push(Brain4it.CLOSE_LIST_TOKEN);
  },

  writeNonList : function(object)
  {
    if (object instanceof Brain4it.Reference)
    {
      this.output.push(object.name);
    }
    else if (typeof object === "string")
    {
      this.output.push('"');
      this.output.push(Brain4it.escapeString(object));
      this.output.push('"');
    }
    else
    {
      this.output.push(String(object));
    }
  },

  getTag : function(list)
  {
    var dataAnchor = this.dataRegistry[list.id];
    // dataAnchor can't be null because there are no thread issues.
    if (dataAnchor.declared)
      return new Brain4it.LinkTag(dataAnchor.getListId());

    var structure = list.getStructure();
    var structureAnchor =  structure === null ?
      null : this.structureRegistry[structure.id];

    var dataListId = dataAnchor.referenceCount > 1 ?
      dataAnchor.getListId() : null;

    var structureListId = structureAnchor !== null &&
      structureAnchor.referenceCount > 1 ?
      structureAnchor.getListId() : null;

    if (dataListId === null && structureListId === null) return null;

    dataAnchor.declared = true;

    return new Brain4it.DeclarationTag(dataListId, structureListId);
  },

  createAnchorMap : function(baseObject)
  {
    var list;
    var cursor;
    this.dataRegistry = {};
    this.structureRegistry = {};
    this.cursorStack = [];

    if (baseObject instanceof Brain4it.List)
    {
      list = baseObject;
      this.registerList(list);
      cursor = new Brain4it.Printer.Cursor(list);
      this.cursorStack.push(cursor);

      while (this.cursorStack.length > 0)
      {
        cursor = this.cursorStack.pop();
        while (cursor.hasNext())
        {
          var element = cursor.getElement();
          cursor.next();
          if (element instanceof Brain4it.List)
          {
            list = element;
            if (this.registerList(list))
            {
              this.cursorStack.push(cursor);
              cursor = new Brain4it.Printer.Cursor(list);
            }
          }
        }
      }
    }
  },

  registerList : function(list)
  {
    var dataAnchor = this.dataRegistry[list.id];
    if (dataAnchor === undefined)
    {
      dataAnchor = new Brain4it.Printer.Anchor(this);
      this.dataRegistry[list.id] = dataAnchor;
      var structure = list.getStructure();
      if (structure !== null)
      {
        var structureAnchor = this.structureRegistry[structure.id];
        if (structureAnchor === undefined)
        {
          this.structureRegistry[structure.id] = dataAnchor;
        }
        else
        {
          structureAnchor.referenceCount++;
        }
      }
      return true;
    }
    else
    {
      dataAnchor.referenceCount++;
      return false;
    }
  }
};

Brain4it.Printer.Anchor = function(printer)
{
  this.printer = printer;
  this.listId = 0;
  this.referenceCount = 1;
  this.declared = false;
};

Brain4it.Printer.Anchor.prototype =
{
  getListId : function()
  {
    if (this.listId === 0)
    {
      this.listId = String(++this.printer.anchorCount);
    }
    return this.listId;
  },

  toString : function()
  {
    return this.listId + "/" + this.referenceCount;
  }
};

Brain4it.Printer.Cursor = function(list)
{
  this.list = list;
  this.index = 0;
};

Brain4it.Printer.Cursor.prototype =
{
  hasNext : function()
  {
    return this.index < this.list.size();
  },

  next : function()
  {
    this.index++;
  },

  getName : function()
  {
    return this.list.getName(this.index);
  },

  getElement : function()
  {
    return this.list.getByIndex(this.index);
  }
};

/* Formatter class */

Brain4it.Formatter = function(configuration)
{
  this.configuration = configuration || new Brain4it.Formatter.Configuration();
  this.output = null;
  this.tokenizer = null;
  this.baseList = null;
  this.currentList = null;
  this.indentLevel = 0;
  this.written = false;
  this.name = null;
};

Brain4it.Formatter.prototype =
{
  format : function(code)
  {
    this.output = [];
    this.tokenizer = new Brain4it.Tokenizer(code);
    this.baseList = null;
    this.currentList = null;
    this.indentLevel = 0;
    this.written = false;
    this.name = null;
    var inline = false;
    var token;

    var end = false;
    while (!end)
    {
      token = this.tokenizer.readToken();
      if (token.type === Brain4it.Token.EOF)
      {
        if (this.baseList !== null)
        {
          this.baseList.print();
        }
        end = true;
      }
      else if (inline)
      {
        this.addToken(token);
        if (this.currentList === null) // baseList closed
        {
          if (this.name === null)
          {
            this.nextLine();
          }
          else
          {
            this.printSpace();
          }
          this.baseList.print();
          this.baseList = null;
          this.name = null;
          inline = false;
        }
        else if (this.isBreakRequired())
        {
          if (this.name === null ||
              this.indentLevel * this.configuration.indentSize +
              this.baseList.getLength() > this.configuration.maxColumns)
          {
            this.baseList.releaseExcedent();
            this.nextLine();
            this.baseList.print();
            this.baseList = null;
            this.currentList = null;
            this.indentLevel++;
            inline = false;
          }
          // else try to print baseList inline in the next line
          this.name = null;
        }
      }
      else // !inline: tokens in vertical
      {
        if (token.type === Brain4it.Token.OPEN_LIST)
        {
          this.baseList = new Brain4it.Formatter.TokenList(this, token);
          this.currentList = this.baseList;
          inline = true;
        }
        else if (token.type === Brain4it.Token.CLOSE_LIST)
        {
          this.indentLevel--;
          this.nextLine();
          this.printToken(token);
        }
        else
        {
          this.nextLine();
          this.printToken(token);
          var nextToken = this.tokenizer.readToken();
          if (nextToken.type === Brain4it.Token.NAME_OPERATOR)
          {
            this.name = String(token.text);
            this.printSpace();
            this.printToken(nextToken); // name operator
            var nextNextToken = this.tokenizer.readToken();
            if (nextNextToken.type !== Brain4it.Token.OPEN_LIST &&
                nextNextToken.type !== Brain4it.Token.EOF)
            {
              if (this.getCurrentColumn() + 1 + nextNextToken.length() >
                  this.configuration.maxColumns)
              {
                this.nextLine();
              }
              else
              {
                this.printSpace();
              }
              this.printToken(nextNextToken);
              this.name = null;
            }
            else this.tokenizer.unreadToken(nextNextToken);
          }
          else this.tokenizer.unreadToken(nextToken);
        }
      }
    }
    return this.output.join("");
  },

  addToken : function(token)
  {
    if (token.type === Brain4it.Token.OPEN_LIST)
    {
      var tokenList =
        new Brain4it.Formatter.TokenList(this, token, this.currentList);
      this.currentList.add(tokenList);
      this.currentList = tokenList;
    }
    else if (token.type === Brain4it.Token.CLOSE_LIST)
    {
      this.currentList.add(token);
      this.currentList = this.currentList.parent;
    }
    else
    {
      this.currentList.add(token);
    }
  },

  getCurrentColumn : function()
  {
    var column = this.indentLevel * this.configuration.indentSize;
    if (this.name !== null)
      column += this.name.length + Brain4it.NAME_OPERATOR_TOKEN.length + 2;
    return column;
  },

  isBreakRequired : function()
  {
    var configuration = this.configuration;

    // check is maxColumn is exceeded
    if (this.getCurrentColumn() + this.baseList.getLength() >
       configuration.maxColumns)
       return true;

    // check if function is not inline
    var functionName = this.baseList.getFunctionName();
    if (functionName === null) return false;
    if (configuration.notInlineFunctions.indexOf(functionName) === -1)
      return false;

    var args = configuration.inlineArguments[functionName];
    if (args === undefined) return true;

    return this.baseList.getCompletedArguments() >= args;
  },

  nextLine : function()
  {
    if (this.written)
    {
      this.printCR();
      for (var i = 0; i < this.indentLevel; i++)
      {
        this.printIndent(this.configuration.indentSize);
      }
    }
  },

  printToken : function(token)
  {
    this.output.push(token.text);
    this.written = true;
  },

  printCR : function()
  {
    this.output.push('\n');
  },

  printIndent : function(indentSize)
  {
    for (var i = 0; i < indentSize; i++)
    {
      this.output.push(' ');
    }
  },

  printSpace : function()
  {
    this.output.push(' ');
  }
};

Brain4it.Formatter.TokenList = function(formatter, openToken, parent)
{
  this.formatter = formatter;
  this.elements = [openToken];
  this.parent = parent || null;
};

Brain4it.Formatter.TokenList.prototype =
{
  releaseExcedent : function()
  {
    var configuration = this.formatter.configuration;
    var functionName = this.getFunctionName();
    if (functionName === null)
    {
      this.unreadTokens(1);
    }
    else
    {
      var args = configuration.inlineArguments[functionName];
      if (args === undefined)
      {
        this.unreadTokens(2);
      }
      else
      {
        if (this.getCompletedArguments() >= args)
        {
          var count = args + 2;
          if (this.getLength(count) < configuration.maxColumns)
          {
            this.unreadTokens(count);
          }
          else
          {
            this.unreadTokens(2);
          }
        }
        else
        {
          this.unreadTokens(2);
        }
      }
    }
  },

  add : function(elem)
  {
    this.elements.push(elem);
  },

  unreadTokens : function(tokensLeft)
  {
    for (var i = this.elements.length - 1; i >= tokensLeft; i--)
    {
      var elem = this.elements[i];
      if (elem instanceof Brain4it.Token)
      {
        var token = elem;
        this.formatter.tokenizer.unreadToken(token);
      }
      else // TokenList
      {
        var tokenList = elem;
        tokenList.unreadTokens(0);
      }
      this.elements.pop();
    }
  },

  isClosed : function()
  {
    var size = this.elements.length;
    var last = this.elements[size - 1];
    if (last instanceof Brain4it.Token)
    {
      var token = last;
      return token.type === Brain4it.Token.CLOSE_LIST;
    }
    return false;
  },

  getCompletedArguments : function()
  {
    var size = this.elements.length;
    var last = this.elements[size - 1];
    if (last instanceof Brain4it.Token)
    {
      var token = last;
      return token.type === Brain4it.Token.CLOSE_LIST ? size - 3 : size - 2;
    }
    else // TokenList
    {
      var tokenList = last;
      return tokenList.isClosed() ? size - 2 : size - 3;
    }
  },

  getLength : function(count)
  {
    count = count || this.elements.length;

    var length = 0;
    for (var i = 0; i < count; i++)
    {
      var elem = this.elements[i];
      if (i > 1 &&
        !(elem instanceof Brain4it.Token &&
          elem.type === Brain4it.Token.CLOSE_LIST))
      {
        length++; // space
      }
      if (elem instanceof Brain4it.Token)
      {
        var token = elem;
        length += token.length();
      }
      else // TokenList
      {
        var tokenList = elem;
        length += tokenList.getLength();
      }
    }
    return length;
  },

  print : function()
  {
    for (var i = 0; i < this.elements.length; i++)
    {
      var elem = this.elements[i];
      if (i > 1 &&
        !(elem instanceof Brain4it.Token &&
          elem.type === Brain4it.Token.CLOSE_LIST))
      {
        this.formatter.printSpace();
      }
      if (elem instanceof Brain4it.Token)
      {
        var token = elem;
        this.formatter.printToken(token);
      }
      else // TokenList
      {
        var tokenList = elem;
        tokenList.print();
      }
    }
  },

  getFunctionName : function()
  {
    if (this.elements.length < 2) return null;
    var elem = this.elements[1];
    if (!(elem instanceof Brain4it.Token)) return null;
    var token = elem;
    if (token.type !== Brain4it.Token.REFERENCE) return null;
    if (this.elements.length >= 3) // test reference is not a name
    {
      elem = this.elements[2];
      if (elem instanceof Brain4it.Token)
      {
        var token2 = elem;
        if (token2.type === Brain4it.Token.NAME_OPERATOR) return null;
      }
    }
    return token.text;
  }
};

Brain4it.Formatter.Configuration = function(indentSize, maxColumns,
  notInlineFunctions, inlineArguments)
{
  this.indentSize = indentSize || 2;
  this.maxColumns = maxColumns || 60;
  this.notInlineFunctions = notInlineFunctions ||
    ["do", "cond", "for", "when", "while"];
  this.inlineArguments = inlineArguments ||
  {
    "function" : 1,
    "if" : 1,
    "set" : 1,
    "when" : 1,
    "while" : 1,
    "for" : 3,
    "for-each" : 2,
    "apply" : 2,
    "find" : 2,
    "sync" : 1
  };
};


/* Client class */

Brain4it.Client = function(serverUrl, path, accessKey, sessionId)
{
  this.serverUrl = serverUrl;
  this.path = path;
  this.accessKey = accessKey || null;
  this.sessionId = sessionId || null;
  this.method = "POST";
  this.request = new XMLHttpRequest();
  this.callback = null;
};

Brain4it.Client.prototype =
{
  send : function(data)
  {
    var scope = this;
    var request = this.request;

    if (request.readyState > 0) request.abort();
    var path = this.path === null ? "" : "/" + escape(this.path);
    request.open(this.method, this.serverUrl + path, true);
    if (this.accessKey)
    {
      request.setRequestHeader(Brain4it.ACCESS_KEY_HEADER, this.accessKey);
    }
    if (this.sessionId)
    {
      request.setRequestHeader(Brain4it.SESSION_ID_HEADER, this.sessionId);
    }
    if (data)
    {
      request.setRequestHeader("Content-Type",
        Brain4it.MIMETYPE + "; charset=" + Brain4it.CHARSET);
    }
    request.onreadystatechange = function()
    {
      if (request.readyState === 4)
      {
        if (scope.callback)
        {
          var value = request.getResponseHeader(Brain4it.SERVER_TIME_HEADER);
          var serverTime = value === null ? 0 : parseFloat(value);
          scope.callback(request.status, request.responseText, serverTime);
        }
      }
    };
    request.send(data);
  },

  abort : function()
  {
    if (this.request)
    {
      this.request.abort();
    }
  }
};

/* Monitor class */

Brain4it.Monitor = function(serverUrl, module, accessKey, sessionId)
{
  this.url = serverUrl + "/" + escape(module);
  this.accessKey = accessKey;
  this.sessionId = sessionId || null;
  this.listeners = {};
  this.watchRequest = new XMLHttpRequest();
  this.connectionDelay = 100;
  this.pollingInterval = 0;
  this.timerId = null;
  this.monitorSessionId = null;
};

Brain4it.Monitor.prototype =
{
  watch : function(functionName, listener)
  {
    if (functionName === undefined || functionName === null) return;

    var functionListeners = this.listeners[functionName];
    if (functionListeners === undefined)
    {
      functionListeners = [listener];
      this.listeners[functionName] = functionListeners;
    }
    else
    {
      if (functionListeners.indexOf(listener) === -1)
      {
        functionListeners.push(listener);
      }
    }
    var scope = this;
    if (this.timerId !== null) // delayed start
    {
      clearTimeout(this.timerId);
    }
    this.timerId = setTimeout(function(){scope.sendWatchRequest();},
      this.connectionDelay);
  },

  unwatch : function(functionName, listener)
  {
    var functionListeners = this.listeners[functionName];
    if (functionListeners)
    {
      var index = functionListeners.indexOf(listener);
      if (index !== -1)
      {
        functionListeners.splice(index, 1);
        if (functionListeners.length === 0)
        {
          delete this.listeners[functionName];
        }
      }
    }
    this.sendWatchRequest();
  },

  unwatchAll : function(sync)
  {
    this.listeners = {};
    var watchRequest = this.watchRequest;
    if (watchRequest.readyState !== 0 && watchRequest.readyState !== 4)
    {
      // request in progress
      watchRequest.abort();
      this.sendUnwatchRequest(sync);
    }
  },

  sendWatchRequest : function()
  {
    var scope = this;
    var watchRequest = this.watchRequest;

    if (watchRequest.readyState !== 0 && watchRequest.readyState !== 4)
    {
      // cancel request in progress
      watchRequest.abort();
      this.sendUnwatchRequest();
    }

    var list = new Brain4it.List();
    for (var functionName in this.listeners)
    {
      list.add(functionName);
    }
    if (list.size() === 0) return; // Monitor is idle, so exit

    watchRequest.open("POST", this.url, true);
    watchRequest.setRequestHeader("Content-Type",
      Brain4it.MIMETYPE + "; charset=" + Brain4it.CHARSET);
    var pollingInterval = 0;
    if (typeof this.pollingInterval === "number")
    {
      if (this.pollingInterval > 0)
      {
        pollingInterval = this.pollingInterval;
      }
    }
    watchRequest.setRequestHeader(Brain4it.MONITOR_HEADER,
      String(pollingInterval));
    if (this.accessKey)
    {
      watchRequest.setRequestHeader(Brain4it.ACCESS_KEY_HEADER, this.accessKey);
    }
    if (this.sessionId)
    {
      watchRequest.setRequestHeader(Brain4it.SESSION_ID_HEADER, this.sessionId);
    }
    var index = 0;
    watchRequest.onprogress = function()
    {
      var response = watchRequest.response;
      var chunkEnd = response.indexOf("\n", index);
      while (chunkEnd !== -1)
      {
        var chunk = response.substring(index, chunkEnd);
        scope.processChunk(chunk);
        index = chunkEnd + 1;
        chunkEnd = response.indexOf("\n", index);
      }
    };
    watchRequest.onreadystatechange = function(event)
    {
      if (watchRequest.readyState === 4)
      {
        console.info("request terminated");
        scope.sendWatchRequest();
      }
    };
    var printer = new Brain4it.Printer();
    var functionNames = printer.print(list);
    console.info(functionNames);
    watchRequest.send(functionNames);
  },

  sendUnwatchRequest : function(sync)
  {
    if (this.monitorSessionId)
    {
      if (typeof sync === "undefined") sync = false;
      var unwatchRequest = new XMLHttpRequest();
      unwatchRequest.open("POST", this.url, !sync);
      unwatchRequest.setRequestHeader("Content-Type",
        Brain4it.MIMETYPE + "; charset=" + Brain4it.CHARSET);
      unwatchRequest.setRequestHeader(Brain4it.MONITOR_HEADER, "0");
      unwatchRequest.send('"' + this.monitorSessionId + '"');
      console.info("unwatch request sent " + this.monitorSessionId +
        " " + sync);
      this.monitorSessionId = null;
    }
  },

  processChunk : function(chunk)
  {
    try
    {
      var parser = new Brain4it.Parser();
      var change = parser.parse(chunk);
      if (change instanceof Brain4it.List)
      {
        var functionName = change.getByIndex(0);
        var value = change.getByIndex(1);
        var serverTime = change.size() < 3 ? 0 : change.getByIndex(2);
        if (typeof serverTime !== "number") serverTime = 0;
        var functionListeners = this.listeners[functionName];
        if (functionListeners)
        {
          for (var i = 0; i < functionListeners.length; i++)
          {
            functionListeners[i](functionName, value, serverTime);
          }
        }
      }
      else if (typeof change === "string")
      {
        this.monitorSessionId = change;
      }
    }
    catch (ex)
    {
      // Ignore
    }
  }
};

/* Invoker class */

Brain4it.Invoker = function(client, moduleName)
{
  this.client = client;
  this.moduleName = moduleName;
  this.queue = [];
  this.sending = false;
};

Brain4it.Invoker.prototype =
{
  invoke: function(functionName, value, coalesce, callback)
  {
    if (typeof functionName !== "string") throw "functionName is required";

    var found = false;

    if (coalesce && callback !== null)
    {
      // update value of call from the same callback
      var i = 0;
      while (i < this.queue.length && !found)
      {
        var call = this.queue[i];
        if (callback === call.callback)
        {
          call.value = value; // set next value to send
          found = true;
        }
        i++;
      }
    }
    if (!found)
    {
      // add new call to queue
      var call =
      {
        functionName: functionName,
        value: value,
        callback : callback
      };
      this.queue.push(call);
    }
    this.internalInvoke();
    return !found;
  },

  internalInvoke : function()
  {
    if (this.sending) return;
    var call = this.queue.shift();
    if (call)
    {
      var functionName = call.functionName;
      var value = call.value;
      var valueString;
      if (typeof value === "string")
      {
        valueString = '"' + Brain4it.escapeString(value) + '"';
      }
      else
      {
        var printer = new Brain4it.Printer();
        valueString = printer.print(value);
      }
      var client = this.client;
      var scope = this;
      client.method = "POST";
      client.path = this.moduleName + "/" + functionName;
      client.callback = function(status, resultString, serverTime)
      {
        if (call.callback)
        {
          call.callback(status, resultString, serverTime);
        }
        scope.sending = false;
        scope.internalInvoke();
      };
      scope.sending = true;
      client.send(valueString);
    }
  }
};

Brain4it.FunctionInvoker = function(invoker, functionName, invokeInterval)
{
  this.invoker = invoker;
  this.functionName = functionName;
  this.invokeInterval = invokeInterval || 0;
  this.invokeTime = 0;
  this.sending = 0;
  this.nextValue = null;
  this.timerId = null;

  var scope = this;
  this.callback = function(status, resultString, serverTime)
  {
    scope.sending--;
    scope.invokeTime = serverTime;
  };
};

Brain4it.FunctionInvoker.prototype =
{
  invoke : function(value)
  {
    if (this.invokeInterval === 0)
    {
      if (this.invoker.invoke(this.functionName, value, true, this.callback))
      {
        this.sending++;
      }
    }
    else
    {
      this.nextValue = value;
      this.internalInvoke();
    }
  },

  isSending : function()
  {
    return this.sending > 0 || this.nextValue !== null;
  },

  updateInvokeTime : function(serverTime)
  {
    if (serverTime > this.invokeTime)
    {
      this.invokeTime = serverTime;
      return true;
    }
    return false;
  },

  internalInvoke : function()
  {
    if (this.timerId) return; // internalInvoke will be called soon by timer

    if (this.nextValue === null) return;

    var value = this.nextValue;
    this.nextValue = null;

    if (this.invoker.invoke(this.functionName, value, true, this.callback))
    {
      this.sending++;
    }

    var scope = this;
    this.timerId = setTimeout(function()
    {
      scope.timerId = null;
      scope.internalInvoke();
    }, this.invokeInterval);
  }
};



/* Helper class */

Brain4it.Helper = function(serverUrl, module, accessKey)
{
  this.functions = [];
  this.functionsMap = {};
  this.serverUrl = serverUrl;
  this.module = module;
  this.accessKey = accessKey;
};

Brain4it.Helper.prototype =
{
  LOAD_FUNCTIONS : "(functions)",

  loadFunctions : function(callback)
  {
    var scope = this;
    var client = new Brain4it.Client(this.serverUrl, this.module, this.accessKey);
    client.method = "POST";
    client.callback = function(status, output)
    {
      if (status === 200)
      {
        var parser = new Brain4it.Parser();
        var object = parser.parse(output);
        if (object instanceof Brain4it.List)
        {
          scope.functions = [];
          scope.functionsMap = {};
          for (var i = 0; i < object.size(); i++)
          {
            var functionReference = object.getByIndex(i);
            var functionName = functionReference.name;
            scope.functions.push(functionName);
            scope.functionsMap[functionName] = true;
          }
        }
      }
      if (callback)
      {
        callback(scope.functions, output);
      }
    };
    client.send(this.LOAD_FUNCTIONS);
  },

  isFunction : function(name)
  {
    return this.functionsMap.propertyIsEnumerable(name);
  }
};

export { Brain4it };
